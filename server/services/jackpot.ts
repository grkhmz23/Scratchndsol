import { Connection, PublicKey } from "@solana/web3.js";
import { db } from "../db";
import { jackpotPurchases } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

type Status = {
  mint: string;
  treasuryTokenAccount: string;
  tokenProgramId: string;
  decimals: number;
  ticketPriceTokens: number;
  ticketPriceBaseUnits: string;
  treasuryBalanceTokens: number;
  treasuryBalanceRaw: string;
  ticketsSold: number;
};

export class JackpotService {
  private connection: Connection;
  private mint: PublicKey;
  private treasuryTokenAccount: PublicKey;
  private ticketPriceTokens: number;

  private cachedDecimals: number | null = null;
  private cachedTokenProgramId: PublicKey | null = null;

  constructor() {
    const rpc =
      process.env.SOLANA_RPC_URL ||
      process.env.VITE_SOLANA_RPC_URL ||
      "https://api.mainnet-beta.solana.com";

    this.connection = new Connection(rpc, "confirmed");

    const mintStr = process.env.JACKPOT_MINT || process.env.VITE_JACKPOT_MINT;
    const treasuryStr =
      process.env.JACKPOT_TREASURY_TOKEN_ACCOUNT ||
      process.env.VITE_JACKPOT_TREASURY_TOKEN_ACCOUNT;

    if (!mintStr) throw new Error("JACKPOT_MINT (or VITE_JACKPOT_MINT) is required");
    if (!treasuryStr)
      throw new Error("JACKPOT_TREASURY_TOKEN_ACCOUNT (or VITE_JACKPOT_TREASURY_TOKEN_ACCOUNT) is required");

    this.mint = new PublicKey(mintStr);
    this.treasuryTokenAccount = new PublicKey(treasuryStr);

    const p = Number(process.env.JACKPOT_TICKET_PRICE_TOKENS || process.env.VITE_JACKPOT_TICKET_PRICE_TOKENS || 1000);
    this.ticketPriceTokens = Number.isFinite(p) && p > 0 ? Math.floor(p) : 1000;
  }

  private async ensureMintInfo(): Promise<{ decimals: number; tokenProgramId: PublicKey }> {
    if (this.cachedDecimals !== null && this.cachedTokenProgramId) {
      return { decimals: this.cachedDecimals, tokenProgramId: this.cachedTokenProgramId };
    }

    const info = await this.connection.getParsedAccountInfo(this.mint, "confirmed");
    if (!info.value) throw new Error("Mint account not found on chain");

    const tokenProgramId = info.value.owner;

    const parsed: any = info.value.data;
    const decimals = parsed?.parsed?.info?.decimals;
    if (typeof decimals !== "number") throw new Error("Unable to read mint decimals");

    this.cachedDecimals = decimals;
    this.cachedTokenProgramId = tokenProgramId;

    return { decimals, tokenProgramId };
  }

  private baseUnitsPerTicket(decimals: number): bigint {
    return BigInt(this.ticketPriceTokens) * BigInt(10) ** BigInt(decimals);
  }

  async getTicketsSold(): Promise<number> {
    const rows = await db
      .select({
        total: sql<number>`coalesce(sum(${jackpotPurchases.tickets}), 0)`,
      })
      .from(jackpotPurchases);

    return rows?.[0]?.total || 0;
  }

  async getUserTickets(wallet: string): Promise<number> {
    const rows = await db
      .select({
        total: sql<number>`coalesce(sum(${jackpotPurchases.tickets}), 0)`,
      })
      .from(jackpotPurchases)
      .where(eq(jackpotPurchases.buyerWallet, wallet));

    return rows?.[0]?.total || 0;
  }

  async getStatus(): Promise<Status> {
    const { decimals, tokenProgramId } = await this.ensureMintInfo();

    const bal = await this.connection.getTokenAccountBalance(this.treasuryTokenAccount, "confirmed");
    const treasuryBalanceRaw = bal.value.amount; // integer string
    const treasuryBalanceTokens = Number(bal.value.uiAmount || 0);

    const ticketsSold = await this.getTicketsSold();
    const perTicket = this.baseUnitsPerTicket(decimals);

    return {
      mint: this.mint.toBase58(),
      treasuryTokenAccount: this.treasuryTokenAccount.toBase58(),
      tokenProgramId: tokenProgramId.toBase58(),
      decimals,
      ticketPriceTokens: this.ticketPriceTokens,
      ticketPriceBaseUnits: perTicket.toString(),
      treasuryBalanceTokens,
      treasuryBalanceRaw,
      ticketsSold,
    };
  }

  async verifyAndRecordPurchase(params: { wallet: string; signature: string }) {
    const { wallet, signature } = params;

    // idempotency
    const existing = await db
      .select()
      .from(jackpotPurchases)
      .where(eq(jackpotPurchases.signature, signature))
      .limit(1);

    if (existing.length) {
      return { alreadyRecorded: true, tickets: existing[0].tickets };
    }

    const { decimals } = await this.ensureMintInfo();
    const perTicket = this.baseUnitsPerTicket(decimals);

    const tx = await this.connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) throw new Error("Transaction not found");

    const signerMatch = tx.transaction.message.accountKeys.some(
      (k: any) => k.pubkey?.toBase58?.() === wallet && k.signer === true
    );
    if (!signerMatch) throw new Error("Wallet is not a signer on this transaction");

    // Find a transferChecked into treasury for this mint
    let amountRaw: bigint | null = null;

    for (const ix of tx.transaction.message.instructions as any[]) {
      if (!ix?.parsed?.info) continue;

      const type = ix.parsed?.type;
      if (type !== "transferChecked") continue;

      const info = ix.parsed.info;
      const dest = info.destination;
      const mint = info.mint;
      const authority = info.authority;

      if (dest !== this.treasuryTokenAccount.toBase58()) continue;
      if (mint !== this.mint.toBase58()) continue;
      if (authority !== wallet) continue;

      const raw =
        info.tokenAmount?.amount ??
        info.amount; // depending on RPC parser
      if (!raw) continue;

      amountRaw = BigInt(raw);
      break;
    }

    if (amountRaw === null) {
      throw new Error("No matching transferChecked to treasury found");
    }

    if (amountRaw < perTicket) {
      throw new Error("Transfer amount is below 1 ticket");
    }

    const tickets = Number(amountRaw / perTicket);
    if (tickets <= 0) throw new Error("Invalid ticket count computed");

    // Require exact multiple to avoid ambiguous partial transfers
    if (amountRaw % perTicket !== BigInt(0)) {
      throw new Error("Transfer amount must be an exact multiple of ticket price");
    }

    await db.insert(jackpotPurchases).values({
      buyerWallet: wallet,
      signature,
      mint: this.mint.toBase58(),
      treasuryTokenAccount: this.treasuryTokenAccount.toBase58(),
      amountRaw: amountRaw.toString(),
      tickets,
      createdAt: new Date(),
    });

    return { alreadyRecorded: false, tickets };
  }
}

export const jackpotService = new JackpotService();