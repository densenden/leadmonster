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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      einstellungen: {
        Row: {
          beschreibung: string | null
          id: string
          schluessel: string
          updated_at: string
          updated_by: string | null
          wert: string | null
        }
        Insert: {
          beschreibung?: string | null
          id?: string
          schluessel: string
          updated_at?: string
          updated_by?: string | null
          wert?: string | null
        }
        Update: {
          beschreibung?: string | null
          id?: string
          schluessel?: string
          updated_at?: string
          updated_by?: string | null
          wert?: string | null
        }
        Relationships: []
      }
      email_sequenzen: {
        Row: {
          aktiv: boolean
          betreff: string | null
          created_at: string
          delay_hours: number
          html_body: string | null
          id: string
          produkt_id: string
          trigger: string | null
          updated_at: string
        }
        Insert: {
          aktiv?: boolean
          betreff?: string | null
          created_at?: string
          delay_hours?: number
          html_body?: string | null
          id?: string
          produkt_id: string
          trigger?: string | null
          updated_at?: string
        }
        Update: {
          aktiv?: boolean
          betreff?: string | null
          created_at?: string
          delay_hours?: number
          html_body?: string | null
          id?: string
          produkt_id?: string
          trigger?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequenzen_produkt_id_fkey"
            columns: ["produkt_id"]
            isOneToOne: false
            referencedRelation: "produkte"
            referencedColumns: ["id"]
          },
        ]
      }
      generierter_content: {
        Row: {
          content: Json | null
          created_at: string
          generated_at: string
          id: string
          meta_desc: string | null
          meta_title: string | null
          page_type: string
          produkt_id: string
          published_at: string | null
          schema_markup: Json | null
          slug: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          generated_at?: string
          id?: string
          meta_desc?: string | null
          meta_title?: string | null
          page_type: string
          produkt_id: string
          published_at?: string | null
          schema_markup?: Json | null
          slug?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          generated_at?: string
          id?: string
          meta_desc?: string | null
          meta_title?: string | null
          page_type?: string
          produkt_id?: string
          published_at?: string | null
          schema_markup?: Json | null
          slug?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generierter_content_produkt_id_fkey"
            columns: ["produkt_id"]
            isOneToOne: false
            referencedRelation: "produkte"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          confluence_page_id: string | null
          confluence_synced: boolean
          created_at: string
          email: string
          id: string
          intent_tag: string | null
          interesse: string | null
          nachname: string | null
          produkt_id: string | null
          resend_sent: boolean
          telefon: string | null
          vorname: string | null
          zielgruppe_tag: string | null
        }
        Insert: {
          confluence_page_id?: string | null
          confluence_synced?: boolean
          created_at?: string
          email: string
          id?: string
          intent_tag?: string | null
          interesse?: string | null
          nachname?: string | null
          produkt_id?: string | null
          resend_sent?: boolean
          telefon?: string | null
          vorname?: string | null
          zielgruppe_tag?: string | null
        }
        Update: {
          confluence_page_id?: string | null
          confluence_synced?: boolean
          created_at?: string
          email?: string
          id?: string
          intent_tag?: string | null
          interesse?: string | null
          nachname?: string | null
          produkt_id?: string | null
          resend_sent?: boolean
          telefon?: string | null
          vorname?: string | null
          zielgruppe_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_produkt_id_fkey"
            columns: ["produkt_id"]
            isOneToOne: false
            referencedRelation: "produkte"
            referencedColumns: ["id"]
          },
        ]
      }
      produkt_config: {
        Row: {
          anbieter: string[] | null
          argumente: Json | null
          created_at: string
          fokus: string | null
          id: string
          produkt_id: string
          updated_at: string
          zielgruppe: string[] | null
        }
        Insert: {
          anbieter?: string[] | null
          argumente?: Json | null
          created_at?: string
          fokus?: string | null
          id?: string
          produkt_id: string
          updated_at?: string
          zielgruppe?: string[] | null
        }
        Update: {
          anbieter?: string[] | null
          argumente?: Json | null
          created_at?: string
          fokus?: string | null
          id?: string
          produkt_id?: string
          updated_at?: string
          zielgruppe?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "produkt_config_produkt_id_fkey"
            columns: ["produkt_id"]
            isOneToOne: false
            referencedRelation: "produkte"
            referencedColumns: ["id"]
          },
        ]
      }
      produkte: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          name: string
          slug: string
          status: string
          typ: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          name: string
          slug: string
          status?: string
          typ: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          slug?: string
          status?: string
          typ?: string
          updated_at?: string
        }
        Relationships: []
      }
      wissensfundus: {
        Row: {
          created_at: string
          id: string
          inhalt: string
          kategorie: string
          tags: string[] | null
          thema: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inhalt: string
          kategorie: string
          tags?: string[] | null
          thema: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inhalt?: string
          kategorie?: string
          tags?: string[] | null
          thema?: string
          updated_at?: string
        }
        Relationships: []
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

// ─── Domain type aliases (derived from generated Database types) ───────────────

export type Produkt = Database['public']['Tables']['produkte']['Row']
export type ProduktStatus = Produkt['status']
export type ProduktTyp = Produkt['typ']
export type ProduktConfig = Database['public']['Tables']['produkt_config']['Row']
export type ProduktWithConfig = Produkt & { produkt_config: ProduktConfig | null }
export type GenerierterContent = Database['public']['Tables']['generierter_content']['Row']
export type Wissensfundus = Database['public']['Tables']['wissensfundus']['Row']
export type Lead = Database['public']['Tables']['leads']['Row']
export type Fokus = NonNullable<ProduktConfig['fokus']>

export interface ActionResult<T = null> {
  success: boolean
  data?: T
  error?: string
  fieldErrors?: Record<string, string | string[]>
}
