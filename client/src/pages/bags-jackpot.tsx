import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { deriveAta, buildTransferCheckedIx, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@/lib/token-transfer';

type JackpotStatus = {
  mint: string;
  treasuryTokenAccount: string;
  tokenProgramId: string;
  decimals: number;
  ticketPriceTokens: number;
  ticketPriceBaseUnits: string; // integer string
  treasuryBalanceTokens: number;
  treasuryBalanceRaw: string; // integer string
  ticketsSold: number;
};

type TicketsResponse = { tickets: number };

const WSOL_MINT = 'So11111111111111111111111111111111111111112';

function formatInt(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

function formatMaybePrice(solPerToken?: number | null): string {
  if (!solPerToken || !Number.isFinite(solPerToken)) return '—';
  if (solPerToken < 0.000001) return solPerToken.toExponential(2) + ' SOL';
  return solPerToken.toFixed(8) + ' SOL';
}

export default function BagsJackpotPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const wallet = publicKey?.toBase58() || '';

  const [ticketCount, setTicketCount] = useState<number>(1);

  const statusQuery = useQuery<JackpotStatus>({
    queryKey: ['/api/jackpot/status'],
    refetchInterval: 2000,
  });

  const ticketsQuery = useQuery<TicketsResponse>({
    queryKey: ['/api/jackpot/tickets', wallet],
    enabled: !!wallet,
    refetchInterval: 2000,
  });

  // Optional Bags quote to show indicative price (server will return 501 if no BAGS_API_KEY)
  const bagsQuoteQuery = useQuery<{ solPerToken: number | null }>({
    queryKey: ['bags-quote', statusQuery.data?.mint || ''],
    enabled: !!statusQuery.data?.mint,
    refetchInterval: 15000,
    queryFn: async () => {
      const mint = statusQuery.data?.mint;
      if (!mint) return { solPerToken: null };

      // 1 SOL in lamports
      const amount = 1_000_000_000;
      const url = `/api/bags/quote?inputMint=${encodeURIComponent(WSOL_MINT)}&outputMint=${encodeURIComponent(mint)}&amount=${amount}`;

      const res = await fetch(url);
      if (!res.ok) return { solPerToken: null };

      const data = await res.json();
      // We return an already computed solPerToken from server if available
      return { solPerToken: typeof data?.solPerToken === 'number' ? data.solPerToken : null };
    },
  });

  const computed = useMemo(() => {
    const st = statusQuery.data;
    if (!st) return null;

    const priceTokens = st.ticketPriceTokens;
    const totalTokens = ticketCount * priceTokens;

    return {
      totalTokens,
      treasuryTokens: st.treasuryBalanceTokens,
    };
  }, [statusQuery.data, ticketCount]);

  const buyMutation = useMutation({
    mutationFn: async () => {
      const st = statusQuery.data;
      if (!st) throw new Error('Jackpot config not loaded.');
      if (!publicKey) throw new Error('Connect wallet first.');

      const mintPk = new PublicKey(st.mint);
      const treasuryTokenAccountPk = new PublicKey(st.treasuryTokenAccount);

      const tokenProgramIdPk = new PublicKey(st.tokenProgramId);
      const isKnown =
        tokenProgramIdPk.equals(TOKEN_PROGRAM_ID) || tokenProgramIdPk.equals(TOKEN_2022_PROGRAM_ID);
      if (!isKnown) {
        throw new Error(`Unsupported token program: ${st.tokenProgramId}`);
      }

      const baseUnitsPerTicket = BigInt(st.ticketPriceBaseUnits);
      const amountBaseUnits = baseUnitsPerTicket * BigInt(ticketCount);

      // Derive user's ATA (requires that user already holds token / has ATA)
      const userAta = deriveAta({
        owner: publicKey,
        mint: mintPk,
        tokenProgramId: tokenProgramIdPk,
      });

      const [userAtaInfo, treasuryInfo] = await Promise.all([
        connection.getAccountInfo(userAta, 'confirmed'),
        connection.getAccountInfo(treasuryTokenAccountPk, 'confirmed'),
      ]);

      if (!userAtaInfo) {
        throw new Error('You do not have a token account for this mint yet. Acquire tokens first.');
      }
      if (!treasuryInfo) {
        throw new Error('Treasury token account not found. Fix server config.');
      }

      const ix = buildTransferCheckedIx({
        source: userAta,
        mint: mintPk,
        destination: treasuryTokenAccountPk,
        authority: publicKey,
        amount: amountBaseUnits,
        decimals: st.decimals,
        tokenProgramId: tokenProgramIdPk,
      });

      const tx = new Transaction().add(ix);

      const signature = await sendTransaction(tx, connection);
      const conf = await connection.confirmTransaction(signature, 'confirmed');
      if (conf.value.err) throw new Error('Transaction failed to confirm.');

      // Record purchase on server (server verifies on-chain transfer)
      const resp = await apiRequest('POST', '/api/jackpot/purchase', {
        wallet: publicKey.toBase58(),
        signature,
      });
      const recorded = await resp.json();

      return { signature, recorded };
    },
    onSuccess: (res) => {
      toast({
        title: 'Tickets purchased',
        description: `Recorded purchase. Tx: ${res.signature.slice(0, 8)}…`,
        className: 'bg-neon-cyan/20 border-neon-cyan/50',
      });

      queryClient.invalidateQueries({ queryKey: ['/api/jackpot/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jackpot/tickets', wallet] });
    },
    onError: (err: any) => {
      toast({
        title: 'Purchase failed',
        description: err?.message || 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const st = statusQuery.data;
  const myTickets = ticketsQuery.data?.tickets ?? 0;

  return (
    <div className="min-h-screen">
      <header className="px-6 py-6 max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <a className="text-neon-cyan hover:text-neon-orange font-bold">← Back</a>
          </Link>
          <h1 className="text-2xl font-black text-white">Bags Jackpot</h1>
        </div>
      </header>

      <main className="px-6 pb-16 max-w-6xl mx-auto">
        <Card className="bg-gradient-to-br from-dark-purple/50 to-deep-space/50 border-2 border-neon-cyan backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <h2 className="text-xl font-black text-neon-cyan mb-3">Token-gated jackpot tickets</h2>
                <p className="text-gray-300 text-sm mb-6">
                  Buy jackpot tickets with the Scratch token. Server verifies the on-chain transfer and records tickets.
                  Jackpot size is the treasury token account balance.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-dark-purple/40 border border-neon-orange/40 rounded-lg p-4">
                    <div className="text-xs text-gray-400">Ticket price</div>
                    <div className="text-lg font-black text-neon-gold">
                      {st ? `${formatInt(st.ticketPriceTokens)} tokens` : 'Loading…'}
                    </div>
                  </div>

                  <div className="bg-dark-purple/40 border border-neon-orange/40 rounded-lg p-4">
                    <div className="text-xs text-gray-400">Indicative price (Bags quote)</div>
                    <div className="text-lg font-black text-neon-gold">
                      {formatMaybePrice(bagsQuoteQuery.data?.solPerToken ?? null)}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      If BAGS_API_KEY is not configured, this shows —.
                    </div>
                  </div>

                  <div className="bg-dark-purple/40 border border-neon-cyan/40 rounded-lg p-4">
                    <div className="text-xs text-gray-400">Jackpot pool (treasury balance)</div>
                    <div className="text-lg font-black text-neon-cyan">
                      {st ? `${formatInt(Math.floor(st.treasuryBalanceTokens))} tokens` : 'Loading…'}
                    </div>
                  </div>

                  <div className="bg-dark-purple/40 border border-neon-cyan/40 rounded-lg p-4">
                    <div className="text-xs text-gray-400">Tickets sold</div>
                    <div className="text-lg font-black text-neon-cyan">
                      {st ? formatInt(st.ticketsSold) : 'Loading…'}
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-neon-gold/10 to-neon-orange/10 border border-neon-gold/40 rounded-xl p-6">
                  <h3 className="text-neon-gold font-black mb-4">Buy tickets</h3>

                  <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400">Number of tickets</label>
                      <Input
                        value={ticketCount}
                        type="number"
                        min={1}
                        max={1000}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isFinite(n)) return;
                          setTicketCount(Math.max(1, Math.min(1000, Math.floor(n))));
                        }}
                        className="mt-1 bg-deep-space/60 border-neon-cyan/40 text-white"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="text-xs text-gray-400">Total cost</label>
                      <div className="mt-1 h-10 flex items-center px-3 rounded-md bg-deep-space/60 border border-neon-cyan/40 text-white font-bold">
                        {computed && st ? `${formatInt(computed.totalTokens)} tokens` : '—'}
                      </div>
                    </div>

                    <Button
                      disabled={!publicKey || buyMutation.isPending || statusQuery.isLoading}
                      onClick={() => buyMutation.mutate()}
                      className="bg-gradient-to-r from-neon-orange to-neon-gold text-black font-black px-6"
                    >
                      {buyMutation.isPending ? 'PROCESSING…' : publicKey ? 'BUY TICKETS' : 'CONNECT WALLET'}
                    </Button>
                  </div>

                  <div className="text-[11px] text-gray-500 mt-3">
                    You must already hold the token (and have a token account). The app transfers tokens to the treasury and then records tickets after on-chain verification.
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-dark-purple/40 border border-neon-cyan/30 rounded-xl p-6">
                  <h3 className="text-white font-black mb-4">Your status</h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Wallet</span>
                      <span className="text-gray-200 text-sm font-mono">
                        {wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Your tickets</span>
                      <span className="text-neon-cyan font-black">{formatInt(myTickets)}</span>
                    </div>

                    <div className="pt-3 border-t border-neon-cyan/20">
                      <div className="text-gray-400 text-xs mb-1">Mint</div>
                      <div className="text-gray-200 text-xs font-mono break-all">
                        {st?.mint || 'Loading…'}
                      </div>

                      <div className="text-gray-400 text-xs mt-3 mb-1">Treasury token account</div>
                      <div className="text-gray-200 text-xs font-mono break-all">
                        {st?.treasuryTokenAccount || 'Loading…'}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neon-cyan/20 text-[11px] text-gray-500">
                      Next step (later): daily draw, commit-reveal randomness, and automatic token payouts from a separate payout authority.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}