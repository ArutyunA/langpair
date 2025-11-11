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
      completed_phrases: {
        Row: {
          completed_at: string
          id: string
          phrase_id: string
          scenario_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          phrase_id: string
          scenario_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          phrase_id?: string
          scenario_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completed_phrases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_vocabulary: {
        Row: {
          day_number: number
          created_at: string
          date: string
          id: string
          language: string
          romanization: string | null
          translation: string
          word: string
        }
        Insert: {
          day_number: number
          created_at?: string
          date?: string
          id?: string
          language: string
          romanization?: string | null
          translation: string
          word: string
        }
        Update: {
          day_number?: number
          created_at?: string
          date?: string
          id?: string
          language?: string
          romanization?: string | null
          translation?: string
          word?: string
        }
        Relationships: []
      }
      daily_scenarios: {
        Row: {
          created_at: string
          day_number: number
          description: string
          id: string
          language: string
          partner_role: string
          title: string
          your_role: string
        }
        Insert: {
          created_at?: string
          day_number: number
          description: string
          id?: string
          language: string
          partner_role: string
          title: string
          your_role: string
        }
        Update: {
          created_at?: string
          day_number?: number
          description?: string
          id?: string
          language?: string
          partner_role?: string
          title?: string
          your_role?: string
        }
        Relationships: []
      }
      daily_scenario_phrases: {
        Row: {
          created_at: string
          id: string
          order_index: number
          phrase: string
          romanization: string | null
          scenario_id: string
          translation: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index: number
          phrase: string
          romanization?: string | null
          scenario_id: string
          translation: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          phrase?: string
          romanization?: string | null
          scenario_id?: string
          translation?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_scenario_phrases_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "daily_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_scenario_prompts: {
        Row: {
          created_at: string
          id: string
          order_index: number
          prompt: string
          scenario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index: number
          prompt: string
          scenario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          prompt?: string
          scenario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_scenario_prompts_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "daily_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          learning_language: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          learning_language: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          learning_language?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      user_daily_tasks: {
        Row: {
          created_at: string
          id: string
          scenario_completed: boolean
          task_date: string
          updated_at: string
          user_id: string
          vocab_completed: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          scenario_completed?: boolean
          task_date?: string
          updated_at?: string
          user_id: string
          vocab_completed?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          scenario_completed?: boolean
          task_date?: string
          updated_at?: string
          user_id?: string
          vocab_completed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          created_at: string
          id: string
          last_activity_date: string | null
          streak: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_activity_date?: string | null
          streak?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_activity_date?: string | null
          streak?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
