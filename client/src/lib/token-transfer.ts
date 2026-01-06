import { PublicKey, TransactionInstruction } from '@solana/web3.js';

// Program IDs
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
);

/**
 * Derive ATA for SPL Token or Token-2022.
 * We include tokenProgramId in the PDA seeds so it works for both programs.
 */
export function deriveAta(params: {
  owner: PublicKey;
  mint: PublicKey;
  tokenProgramId: PublicKey;
}): PublicKey {
  const { owner, mint, tokenProgramId } = params;

  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgramId.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return ata;
}

/**
 * TransferChecked instruction (works for SPL Token and Token-2022 for standard mints).
 * Accounts: source, mint, destination, authority(signer)
 *
 * Instruction enum: TransferChecked = 12
 * Data: u8(12) + u64(amount LE) + u8(decimals)
 */
export function buildTransferCheckedIx(params: {
  source: PublicKey;
  mint: PublicKey;
  destination: PublicKey;
  authority: PublicKey;
  amount: bigint; // base units
  decimals: number;
  tokenProgramId: PublicKey;
}): TransactionInstruction {
  const { source, mint, destination, authority, amount, decimals, tokenProgramId } = params;

  const data = new Uint8Array(1 + 8 + 1);
  data[0] = 12;
  const dv = new DataView(data.buffer);
  dv.setBigUint64(1, amount, true);
  data[1 + 8] = decimals & 0xff;

  return new TransactionInstruction({
    programId: tokenProgramId,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    data,
  });
}