import { pgTable, uuid, text, boolean, integer, numeric, timestamp, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Supabase Auth owns these UUIDs. The profile database may be separate from
  // Supabase, so this intentionally has no foreign key to the legacy users table.
  user_id: uuid("user_id").notNull().unique(),
  username: text("username"),
  display_name: text("display_name"),
  avatar_url: text("avatar_url"),
  trading_style: text("trading_style"),
  preferred_pair: text("preferred_pair"),
  preferred_timeframe: text("preferred_timeframe"),
  is_premium: boolean("is_premium").default(false),
  subscription_tier: text("subscription_tier").notNull().default("free"),
  daily_analyses_used: integer("daily_analyses_used").default(0),
  last_analysis_reset: timestamp("last_analysis_reset").defaultNow(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const analyses = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  pair: text("pair").notNull(),
  timeframe: text("timeframe").notNull(),
  style: text("style").notNull(),
  image_url: text("image_url"),
  trend: text("trend").notNull(),
  bias: text("bias").notNull(),
  probability: integer("probability").notNull(),
  risk_score: integer("risk_score").notNull(),
  support_levels: text("support_levels").array().default([]),
  resistance_levels: text("resistance_levels").array().default([]),
  market_structure: text("market_structure"),
  detected_patterns: text("detected_patterns").array().default([]),
  supply_demand_zones: text("supply_demand_zones").array().default([]),
  possible_outcomes: text("possible_outcomes").array().default([]),
  stop_loss: text("stop_loss"),
  take_profit: text("take_profit"),
  reasoning: text("reasoning"),
  disclaimer: text("disclaimer"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const riskSettings = pgTable("risk_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().unique(),
  risk_per_trade: numeric("risk_per_trade", { precision: 5, scale: 2 }).notNull().default("1.0"),
  max_trades_per_day: integer("max_trades_per_day").notNull().default(5),
  max_daily_loss: numeric("max_daily_loss", { precision: 5, scale: 2 }).notNull().default("5.0"),
  daily_profit_lock: numeric("daily_profit_lock", { precision: 5, scale: 2 }).notNull().default("0"),
  confidence_threshold: integer("confidence_threshold").notNull().default(70),
  automation_mode: text("automation_mode").notNull().default("manual"),
  circuit_breaker_enabled: boolean("circuit_breaker_enabled").notNull().default(true),
  news_filter_enabled: boolean("news_filter_enabled").notNull().default(false),
  kill_switch_active: boolean("kill_switch_active").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const trades = pgTable("trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  analysis_id: uuid("analysis_id").references(() => analyses.id, { onDelete: "set null" }),
  pair: text("pair").notNull(),
  direction: text("direction").notNull(),
  entry_price: numeric("entry_price", { precision: 20, scale: 8 }).notNull(),
  stop_loss: numeric("stop_loss", { precision: 20, scale: 8 }).notNull(),
  take_profit: numeric("take_profit", { precision: 20, scale: 8 }).notNull(),
  lot_size: numeric("lot_size", { precision: 10, scale: 4 }).notNull().default("0.01"),
  status: text("status").notNull().default("open"),
  outcome: text("outcome").default("pending"),
  pnl: numeric("pnl", { precision: 20, scale: 2 }).default("0"),
  execution_mode: text("execution_mode").notNull().default("manual"),
  risk_reward: numeric("risk_reward", { precision: 5, scale: 2 }),
  confidence: integer("confidence"),
  opened_at: timestamp("opened_at").notNull().defaultNow(),
  closed_at: timestamp("closed_at"),
  notes: text("notes"),
});

export const riskConsent = pgTable("risk_consent", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().unique(),
  consent_text: text("consent_text").notNull(),
  consented_at: timestamp("consented_at").notNull().defaultNow(),
});

export const metatraderSettings = pgTable("metatrader_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().unique(),
  account_id: text("account_id").notNull().default(""),
  api_token: text("api_token").notNull().default(""),
  server_region: text("server_region").notNull().default("new-york"),
  is_connected: boolean("is_connected").notNull().default(false),
  platform: text("platform").notNull().default("mt5"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const passwordResets = pgTable("password_resets", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  token: text("token").notNull().unique(),
  expires_at: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});
