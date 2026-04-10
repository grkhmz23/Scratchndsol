/**
 * Enhanced Validation Schemas
 * 
 * Comprehensive input validation using Zod
 */

import { z } from "zod";

// Solana wallet address validation
export const walletAddressSchema = z.string().refine(
  (val) => {
    // Allow demo wallets
    if (val.startsWith("demo") || val.startsWith("Demo")) return true;
    // Solana base58 address format
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(val);
  },
  { message: "Invalid Solana wallet address" }
);

// Transaction signature validation
export const transactionSignatureSchema = z.string().refine(
  (val) => {
    // Demo signatures
    if (val.startsWith("demo_")) return true;
    // Base58 signature format (varies in length)
    return /^[1-9A-HJ-NP-Za-km-z]{64,128}$/.test(val);
  },
  { message: "Invalid transaction signature" }
);

// Ticket cost validation
export const ticketCostSchema = z.number().refine(
  (val) => [0.1, 0.2, 0.5, 0.75, 1.0].includes(val),
  { message: "Invalid ticket cost. Must be 0.1, 0.2, 0.5, 0.75, or 1.0 SOL" }
);

// UUID validation
export const uuidSchema = z.string().uuid();

// Game creation request
export const createGameRequestSchema = z.object({
  purchaseSignature: transactionSignatureSchema,
  playerWallet: walletAddressSchema,
  ticketCost: z.number().positive().max(10, "Ticket cost too high"),
});

// Payout request
export const payoutRequestSchema = z.object({
  playerWallet: walletAddressSchema,
  winAmount: z.string().regex(/^\d+(\.\d+)?$/, "Invalid amount format"),
  gameId: uuidSchema,
});

// Jackpot purchase request
export const jackpotPurchaseSchema = z.object({
  wallet: walletAddressSchema,
  signature: transactionSignatureSchema,
});

// Pool check request
export const poolCheckSchema = z.object({
  ticketCost: z.number().positive(),
});

// RPC proxy request
export const rpcProxySchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.string().min(1).max(100),
  params: z.array(z.any()).optional(),
});

// Generic string sanitization
export const sanitizedString = z.string()
  .max(1000, "String too long")
  .transform((val) => val
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .trim()
  );

// Pagination params
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Export types
export type CreateGameRequest = z.infer<typeof createGameRequestSchema>;
export type PayoutRequest = z.infer<typeof payoutRequestSchema>;
export type JackpotPurchaseRequest = z.infer<typeof jackpotPurchaseSchema>;
export type PoolCheckRequest = z.infer<typeof poolCheckSchema>;
export type RPCProxyRequest = z.infer<typeof rpcProxySchema>;
