CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pair" text NOT NULL,
	"timeframe" text NOT NULL,
	"style" text NOT NULL,
	"image_url" text,
	"trend" text NOT NULL,
	"bias" text NOT NULL,
	"probability" integer NOT NULL,
	"risk_score" integer NOT NULL,
	"support_levels" text[] DEFAULT '{}',
	"resistance_levels" text[] DEFAULT '{}',
	"market_structure" text,
	"detected_patterns" text[] DEFAULT '{}',
	"supply_demand_zones" text[] DEFAULT '{}',
	"possible_outcomes" text[] DEFAULT '{}',
	"stop_loss" text,
	"take_profit" text,
	"reasoning" text,
	"disclaimer" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metatrader_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text DEFAULT '' NOT NULL,
	"api_token" text DEFAULT '' NOT NULL,
	"server_region" text DEFAULT 'new-york' NOT NULL,
	"is_connected" boolean DEFAULT false NOT NULL,
	"platform" text DEFAULT 'mt5' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "metatrader_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"username" text,
	"display_name" text,
	"avatar_url" text,
	"trading_style" text,
	"preferred_pair" text,
	"preferred_timeframe" text,
	"is_premium" boolean DEFAULT false,
	"subscription_tier" text DEFAULT 'free' NOT NULL,
	"daily_analyses_used" integer DEFAULT 0,
	"last_analysis_reset" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "risk_consent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"consent_text" text NOT NULL,
	"consented_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "risk_consent_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "risk_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"risk_per_trade" numeric(5, 2) DEFAULT '1.0' NOT NULL,
	"max_trades_per_day" integer DEFAULT 5 NOT NULL,
	"max_daily_loss" numeric(5, 2) DEFAULT '5.0' NOT NULL,
	"daily_profit_lock" numeric(5, 2) DEFAULT '0' NOT NULL,
	"confidence_threshold" integer DEFAULT 70 NOT NULL,
	"automation_mode" text DEFAULT 'manual' NOT NULL,
	"circuit_breaker_enabled" boolean DEFAULT true NOT NULL,
	"news_filter_enabled" boolean DEFAULT false NOT NULL,
	"kill_switch_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "risk_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"analysis_id" uuid,
	"pair" text NOT NULL,
	"direction" text NOT NULL,
	"entry_price" numeric(20, 8) NOT NULL,
	"stop_loss" numeric(20, 8) NOT NULL,
	"take_profit" numeric(20, 8) NOT NULL,
	"lot_size" numeric(10, 4) DEFAULT '0.01' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"outcome" text DEFAULT 'pending',
	"pnl" numeric(20, 2) DEFAULT '0',
	"execution_mode" text DEFAULT 'manual' NOT NULL,
	"risk_reward" numeric(5, 2),
	"confidence" integer,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text DEFAULT 'supabase-auth' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metatrader_settings" ADD CONSTRAINT "metatrader_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_consent" ADD CONSTRAINT "risk_consent_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_settings" ADD CONSTRAINT "risk_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE set null ON UPDATE no action;