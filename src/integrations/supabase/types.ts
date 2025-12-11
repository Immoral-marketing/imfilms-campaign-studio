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
      campaign_addons: {
        Row: {
          addon_type: string
          campaign_id: string
          id: string
          notes: string | null
        }
        Insert: {
          addon_type: string
          campaign_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          addon_type?: string
          campaign_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_addons_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_assets: {
        Row: {
          campaign_id: string
          created_at: string
          file_url: string
          id: string
          notes: string | null
          status: string | null
          type: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          file_url: string
          id?: string
          notes?: string | null
          status?: string | null
          type: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          file_url?: string
          id?: string
          notes?: string | null
          status?: string | null
          type?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_conflicts: {
        Row: {
          campaign_id: string
          conflict_level: string
          created_at: string
          id: string
          other_campaign_id: string
          reason: string
        }
        Insert: {
          campaign_id: string
          conflict_level: string
          created_at?: string
          id?: string
          other_campaign_id: string
          reason: string
        }
        Update: {
          campaign_id?: string
          conflict_level?: string
          created_at?: string
          id?: string
          other_campaign_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_conflicts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_conflicts_other_campaign_id_fkey"
            columns: ["other_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_messages: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          message: string
          read_by_admin: boolean | null
          read_by_distributor: boolean | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          message: string
          read_by_admin?: boolean | null
          read_by_distributor?: boolean | null
          sender_id: string
          sender_role: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          message?: string
          read_by_admin?: boolean | null
          read_by_distributor?: boolean | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_notifications: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_notifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_platforms: {
        Row: {
          campaign_id: string
          id: string
          platform_name: string
        }
        Insert: {
          campaign_id: string
          id?: string
          platform_name: string
        }
        Update: {
          campaign_id?: string
          id?: string
          platform_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_platforms_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_reports: {
        Row: {
          campaign_id: string
          created_at: string | null
          file_url: string
          id: string
          report_type: string | null
          title_id: string | null
          uploaded_by: string
          version: number | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          file_url: string
          id?: string
          report_type?: string | null
          title_id?: string | null
          uploaded_by: string
          version?: number | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          file_url?: string
          id?: string
          report_type?: string | null
          title_id?: string | null
          uploaded_by?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_reports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_reports_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_templates: {
        Row: {
          created_at: string | null
          description: string | null
          distributor_id: string
          id: string
          investment_distribution: Json | null
          investment_range_max: number | null
          investment_range_min: number | null
          name: string
          platforms: Json | null
          strategic_notes: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          distributor_id: string
          id?: string
          investment_distribution?: Json | null
          investment_range_max?: number | null
          investment_range_min?: number | null
          name: string
          platforms?: Json | null
          strategic_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          distributor_id?: string
          id?: string
          investment_distribution?: Json | null
          investment_range_max?: number | null
          investment_range_min?: number | null
          name?: string
          platforms?: Json | null
          strategic_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_templates_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          ad_investment_amount: number
          additional_comments: string | null
          addons_base_amount: number | null
          conflict_score: number | null
          conflict_status: string | null
          contact_email: string
          contact_name: string
          contact_phone: string
          copies_estimate: string | null
          created_at: string
          creatives_deadline: string
          distributor_id: string
          film_id: string
          final_report_date: string
          fixed_fee_amount: number
          id: string
          is_first_release: boolean
          main_goals: string[] | null
          pre_end_date: string
          pre_start_date: string
          premiere_weekend_end: string
          premiere_weekend_start: string
          public_share_token: string | null
          setup_fee_amount: number
          status: string | null
          target_audience_text: string | null
          territory: string | null
          title_id: string | null
          total_estimated_amount: number
          variable_fee_amount: number
        }
        Insert: {
          ad_investment_amount: number
          additional_comments?: string | null
          addons_base_amount?: number | null
          conflict_score?: number | null
          conflict_status?: string | null
          contact_email: string
          contact_name: string
          contact_phone: string
          copies_estimate?: string | null
          created_at?: string
          creatives_deadline: string
          distributor_id: string
          film_id: string
          final_report_date: string
          fixed_fee_amount: number
          id?: string
          is_first_release: boolean
          main_goals?: string[] | null
          pre_end_date: string
          pre_start_date: string
          premiere_weekend_end: string
          premiere_weekend_start: string
          public_share_token?: string | null
          setup_fee_amount: number
          status?: string | null
          target_audience_text?: string | null
          territory?: string | null
          title_id?: string | null
          total_estimated_amount: number
          variable_fee_amount: number
        }
        Update: {
          ad_investment_amount?: number
          additional_comments?: string | null
          addons_base_amount?: number | null
          conflict_score?: number | null
          conflict_status?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          copies_estimate?: string | null
          created_at?: string
          creatives_deadline?: string
          distributor_id?: string
          film_id?: string
          final_report_date?: string
          fixed_fee_amount?: number
          id?: string
          is_first_release?: boolean
          main_goals?: string[] | null
          pre_end_date?: string
          pre_start_date?: string
          premiere_weekend_end?: string
          premiere_weekend_start?: string
          public_share_token?: string | null
          setup_fee_amount?: number
          status?: string | null
          target_audience_text?: string | null
          territory?: string | null
          title_id?: string | null
          total_estimated_amount?: number
          variable_fee_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_users: {
        Row: {
          can_manage_billing: boolean | null
          can_manage_campaigns: boolean | null
          can_receive_reports: boolean | null
          created_at: string | null
          distributor_id: string
          id: string
          is_active: boolean | null
          is_owner: boolean | null
          pending_approval: boolean | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_manage_billing?: boolean | null
          can_manage_campaigns?: boolean | null
          can_receive_reports?: boolean | null
          created_at?: string | null
          distributor_id: string
          id?: string
          is_active?: boolean | null
          is_owner?: boolean | null
          pending_approval?: boolean | null
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_manage_billing?: boolean | null
          can_manage_campaigns?: boolean | null
          can_receive_reports?: boolean | null
          created_at?: string | null
          distributor_id?: string
          id?: string
          is_active?: boolean | null
          is_owner?: boolean | null
          pending_approval?: boolean | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributor_users_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      distributors: {
        Row: {
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          has_completed_onboarding: boolean | null
          id: string
          is_active: boolean
          main_country: string | null
          normalized_name: string | null
          region: string | null
          updated_at: string
        }
        Insert: {
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          has_completed_onboarding?: boolean | null
          id: string
          is_active?: boolean
          main_country?: string | null
          normalized_name?: string | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          has_completed_onboarding?: boolean | null
          id?: string
          is_active?: boolean
          main_country?: string | null
          normalized_name?: string | null
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      films: {
        Row: {
          copies_estimate: string | null
          country: string
          created_at: string
          distributor_id: string
          distributor_name: string
          genre: string
          id: string
          main_goals: string[] | null
          release_date: string
          target_audience_text: string | null
          title: string
        }
        Insert: {
          copies_estimate?: string | null
          country: string
          created_at?: string
          distributor_id: string
          distributor_name: string
          genre: string
          id?: string
          main_goals?: string[] | null
          release_date: string
          target_audience_text?: string | null
          title: string
        }
        Update: {
          copies_estimate?: string | null
          country?: string
          created_at?: string
          distributor_id?: string
          distributor_name?: string
          genre?: string
          id?: string
          main_goals?: string[] | null
          release_date?: string
          target_audience_text?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "films_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          keywords: string[] | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          keywords?: string[] | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          keywords?: string[] | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      titles: {
        Row: {
          country: string | null
          created_at: string | null
          distributor_id: string
          film_title: string
          genre: string | null
          id: string
          internal_title_code: string | null
          notes: string | null
          planned_release_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          distributor_id: string
          film_title: string
          genre?: string | null
          id?: string
          internal_title_code?: string | null
          notes?: string | null
          planned_release_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          distributor_id?: string
          film_title?: string
          genre?: string | null
          id?: string
          internal_title_code?: string | null
          notes?: string | null
          planned_release_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "titles_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_distributor_owner: {
        Args: { _distributor_id: string; _user_id: string }
        Returns: boolean
      }
      normalize_company_name: { Args: { name: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
