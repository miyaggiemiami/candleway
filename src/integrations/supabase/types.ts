export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          bias: string
          created_at: string
          detected_patterns: string[] | null
          disclaimer: string | null
          id: string
          image_url: string | null
          market_structure: string | null
          pair: string
          possible_outcomes: string[] | null
          probability: number
          reasoning: string | null
          resistance_levels: string[] | null
          risk_score: number
          stop_loss: string | null
          style: string
          supply_demand_zones: string[] | null
          support_levels: string[] | null
          take_profit: string | null
          timeframe: string
          trend: string
          user_id: string
        }
        Insert: {
          bias: string
          created_at?: string
          detected_patterns?: string[] | null
          disclaimer?: string | null
          id?: string
          image_url?: string | null
          market_structure?: string | null
          pair: string
          possible_outcomes?: string[] | null
          probability: number
          reasoning?: string | null
          resistance_levels?: string[] | null
          risk_score: number
          stop_loss?: string | null
          style: string
          supply_demand_zones?: string[] | null
          support_levels?: string[] | null
          take_profit?: string | null
          timeframe: string
          trend: string
          user_id: string
        }
        Update: {
          bias?: string
          created_at?: string
          detected_patterns?: string[] | null
          disclaimer?: string | null
          id?: string
          image_url?: string | null
          market_structure?: string | null
          pair?: string
          possible_outcomes?: string[] | null
          probability?: number
          reasoning?: string | null
          resistance_levels?: string[] | null
          risk_score?: number
          stop_loss?: string | null
          style?: string
          supply_demand_zones?: string[] | null
          support_levels?: string[] | null
          take_profit?: string | null
          timeframe?: string
          trend?: string
          user_id?: string
        }
        Relationships: []
      }
      metatrader_settings: {
        Row: {
          account_id: string
          api_token: string
          created_at: string
          id: string
          is_connected: boolean
          platform: string
          server_region: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string
          api_token?: string
          created_at?: string
          id?: string
          is_connected?: boolean
          platform?: string
          server_region?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          api_token?: string
          created_at?: string
          id?: string
          is_connected?: boolean
          platform?: string
          server_region?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          daily_analyses_used: number | null
          display_name: string | null
          id: string
          is_premium: boolean | null
          last_analysis_reset: string | null
          preferred_pair: string | null
          preferred_timeframe: string | null
          subscription_tier: string
          trading_style: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          daily_analyses_used?: number | null
          display_name?: string | null
          id?: string
          is_premium?: boolean | null
          last_analysis_reset?: string | null
          preferred_pair?: string | null
          preferred_timeframe?: string | null
          subscription_tier?: string
          trading_style?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          daily_analyses_used?: number | null
          display_name?: string | null
          id?: string
          is_premium?: boolean | null
          last_analysis_reset?: string | null
          preferred_pair?: string | null
          preferred_timeframe?: string | null
          subscription_tier?: string
          trading_style?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      risk_consent: {
        Row: {
          consent_text: string
          consented_at: string
          id: string
          user_id: string
        }
        Insert: {
          consent_text: string
          consented_at?: string
          id?: string
          user_id: string
        }
        Update: {
          consent_text?: string
          consented_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_settings: {
        Row: {
          automation_mode: string
          circuit_breaker_enabled: boolean
          confidence_threshold: number
          created_at: string
          daily_profit_lock: number
          id: string
          kill_switch_active: boolean
          max_daily_loss: number
          max_trades_per_day: number
          news_filter_enabled: boolean
          risk_per_trade: number
          updated_at: string
          user_id: string
        }
        Insert: {
          automation_mode?: string
          circuit_breaker_enabled?: boolean
          confidence_threshold?: number
          created_at?: string
          daily_profit_lock?: number
          id?: string
          kill_switch_active?: boolean
          max_daily_loss?: number
          max_trades_per_day?: number
          news_filter_enabled?: boolean
          risk_per_trade?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          automation_mode?: string
          circuit_breaker_enabled?: boolean
          confidence_threshold?: number
          created_at?: string
          daily_profit_lock?: number
          id?: string
          kill_switch_active?: boolean
          max_daily_loss?: number
          max_trades_per_day?: number
          news_filter_enabled?: boolean
          risk_per_trade?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          analysis_id: string | null
          closed_at: string | null
          confidence: number | null
          direction: string
          entry_price: number
          execution_mode: string
          id: string
          lot_size: number
          notes: string | null
          opened_at: string
          outcome: string | null
          pair: string
          pnl: number | null
          risk_reward: number | null
          status: string
          stop_loss: number
          take_profit: number
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          closed_at?: string | null
          confidence?: number | null
          direction: string
          entry_price: number
          execution_mode?: string
          id?: string
          lot_size?: number
          notes?: string | null
          opened_at?: string
          outcome?: string | null
          pair: string
          pnl?: number | null
          risk_reward?: number | null
          status?: string
          stop_loss: number
          take_profit: number
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          closed_at?: string | null
          confidence?: number | null
          direction?: string
          entry_price?: number
          execution_mode?: string
          id?: string
          lot_size?: number
          notes?: string | null
          opened_at?: string
          outcome?: string | null
          pair?: string
          pnl?: number | null
          risk_reward?: number | null
          status?: string
          stop_loss?: number
          take_profit?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
