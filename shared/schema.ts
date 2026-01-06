import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerWallet: text("player_wallet").notNull(),
  ticketType: decimal("ticket_type", { precision: 10, scale: 2 }).notNull(),
  maxWin: decimal("max_win", { precision: 10, scale: 2 }).notNull(),
  symbols: text("symbols").array().notNull(),
  isWin: boolean("is_win").notNull().default(false),
  multiplier: integer("multiplier").default(0),
  winAmount: decimal("win_amount", { precision: 10, scale: 2 }).default("0"),
  purchaseSignature: text("purchase_signature").notNull(),
  payoutSignature: text("payout_signature"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gameStats = pgTable("game_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  totalPool: decimal("total_pool", { precision: 10, scale: 2 }).notNull().default("0"),
  totalWins: integer("total_wins").notNull().default(0),
  lastWinAmount: decimal("last_win_amount", { precision: 10, scale: 2 }).default("0"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const jackpotPurchases = pgTable(
  "jackpot_purchases",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    buyerWallet: text("buyer_wallet").notNull(),
    signature: text("signature").notNull(),
    mint: text("mint").notNull(),
    treasuryTokenAccount: text("treasury_token_account").notNull(),
    amountRaw: text("amount_raw").notNull(), // base units integer string
    tickets: integer("tickets").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    sigUnique: uniqueIndex("jackpot_purchases_signature_unique").on(t.signature),
  })
);

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
});

export const insertGameStatsSchema = createInsertSchema(gameStats).omit({
  id: true,
  updatedAt: true,
});

export const insertJackpotPurchaseSchema = createInsertSchema(jackpotPurchases).omit({
  id: true,
  createdAt: true,
});

export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;
export type InsertGameStats = z.infer<typeof insertGameStatsSchema>;
export type GameStats = typeof gameStats.$inferSelect;
export type JackpotPurchase = typeof jackpotPurchases.$inferSelect;
export type InsertJackpotPurchase = z.infer<typeof insertJackpotPurchaseSchema>;

export const ticketTypes = [
  { cost: 0.1, maxWin: 1 },
  { cost: 0.2, maxWin: 2 },
  { cost: 0.5, maxWin: 5 },
  { cost: 0.75, maxWin: 7.5 },
  { cost: 1.0, maxWin: 10 },
] as const;

export const gameSymbols = ['🎉', '💎', '❌', '🎯', '⭐'] as const;
export const multipliers = [1, 2, 5, 10] as const;