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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      businesses: {
        Row: {
          category: string
          category_id: string | null
          city: string
          content_json: Json | null
          created_at: string
          donation_30d: number | null
          id: string
          location: string
          name: string
          owner_id: string | null
          status: Database["public"]["Enums"]["business_status"] | null
          updated_at: string | null
        }
        Insert: {
          category: string
          category_id?: string | null
          city: string
          content_json?: Json | null
          created_at?: string
          donation_30d?: number | null
          id?: string
          location: string
          name: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["business_status"] | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          category_id?: string | null
          city?: string
          content_json?: Json | null
          created_at?: string
          donation_30d?: number | null
          id?: string
          location?: string
          name?: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["business_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          cities: string[] | null
          count: number
          created_at: string
          icon: string
          id: string
          is_hidden: boolean
          name: string
          position: number
        }
        Insert: {
          cities?: string[] | null
          count?: number
          created_at?: string
          icon?: string
          id?: string
          is_hidden?: boolean
          name: string
          position?: number
        }
        Update: {
          cities?: string[] | null
          count?: number
          created_at?: string
          icon?: string
          id?: string
          is_hidden?: boolean
          name?: string
          position?: number
        }
        Relationships: []
      }
      coins: {
        Row: {
          amount: number
          hash: string
          id: string
          id_text: string
          profile_balance: number
          total_balance: number
          when: string
          who: string
        }
        Insert: {
          amount: number
          hash: string
          id?: string
          id_text: string
          profile_balance: number
          total_balance: number
          when?: string
          who: string
        }
        Update: {
          amount?: number
          hash?: string
          id?: string
          id_text?: string
          profile_balance?: number
          total_balance?: number
          when?: string
          who?: string
        }
        Relationships: [
          {
            foreignKeyName: "coins_who_fkey"
            columns: ["who"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange: {
        Row: {
          amount: number
          comment: string | null
          created_at: string
          creator: string
          id: number
          product_ids: string[]
          provider: string
          status: Database["public"]["Enums"]["exchange_status"]
          type: Database["public"]["Enums"]["exchange_type"]
        }
        Insert: {
          amount?: number
          comment?: string | null
          created_at?: string
          creator: string
          id?: number
          product_ids?: string[]
          provider: string
          status?: Database["public"]["Enums"]["exchange_status"]
          type?: Database["public"]["Enums"]["exchange_type"]
        }
        Update: {
          amount?: number
          comment?: string | null
          created_at?: string
          creator?: string
          id?: number
          product_ids?: string[]
          provider?: string
          status?: Database["public"]["Enums"]["exchange_status"]
          type?: Database["public"]["Enums"]["exchange_type"]
        }
        Relationships: [
          {
            foreignKeyName: "exchange_creator_fkey"
            columns: ["creator"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_provider_fkey"
            columns: ["provider"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          from_id: string
          id: number
          message: string
          to_id: string
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          created_at?: string
          from_id: string
          id?: number
          message: string
          to_id: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          created_at?: string
          from_id?: string
          id?: number
          message?: string
          to_id?: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: []
      }
      news: {
        Row: {
          content: string | null
          created_at: string
          event_date: string | null
          id: string
          image_url: string | null
          is_event: boolean
          is_published: boolean
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          image_url?: string | null
          is_event?: boolean
          is_published?: boolean
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          image_url?: string | null
          is_event?: boolean
          is_published?: boolean
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          content: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number | null
          producer_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price?: number | null
          producer_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number | null
          producer_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          first_name: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          last_name: string | null
          logo_url: string | null
          phone: string | null
          updated_at: string
          user_id: string
          wallet: number
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          last_name?: string | null
          logo_url?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          wallet?: number
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          last_name?: string | null
          logo_url?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          wallet?: number
        }
        Relationships: []
      }
      promotions: {
        Row: {
          business_id: string | null
          created_at: string
          description: string | null
          discount: string
          id: string
          image_url: string | null
          is_active: boolean
          owner_id: string
          title: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          discount: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          owner_id: string
          title: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          discount?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          owner_id?: string
          title?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          from_id: string
          id: string
          to_id: string
          when: string
        }
        Insert: {
          amount: number
          from_id: string
          id?: string
          to_id: string
          when?: string
        }
        Update: {
          amount?: number
          from_id?: string
          id?: string
          to_id?: string
          when?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_id_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "visitor"
        | "client"
        | "moderator"
        | "news_editor"
        | "super_admin"
      business_status: "draft" | "moderation" | "published" | "deleted"
      exchange_status:
        | "created"
        | "ok_meeting"
        | "reject"
        | "pending"
        | "finished"
      exchange_type: "goods" | "money"
      message_type:
        | "admin_status"
        | "from_admin"
        | "chat"
        | "exchange"
        | "income"
        | "deleted"
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
      app_role: [
        "visitor",
        "client",
        "moderator",
        "news_editor",
        "super_admin",
      ],
      business_status: ["draft", "moderation", "published", "deleted"],
      exchange_status: [
        "created",
        "ok_meeting",
        "reject",
        "pending",
        "finished",
      ],
      exchange_type: ["goods", "money"],
      message_type: [
        "admin_status",
        "from_admin",
        "chat",
        "exchange",
        "income",
        "deleted",
      ],
    },
  },
} as const
