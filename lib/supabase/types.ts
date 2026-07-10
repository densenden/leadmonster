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
          autor_id: string | null
          content: Json | null
          created_at: string
          freshness_score: number | null
          generated_at: string
          id: string
          meta_desc: string | null
          meta_title: string | null
          next_review_at: string | null
          page_type: string
          produkt_id: string
          published_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          schema_markup: Json | null
          slug: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          content?: Json | null
          created_at?: string
          freshness_score?: number | null
          generated_at?: string
          id?: string
          meta_desc?: string | null
          meta_title?: string | null
          next_review_at?: string | null
          page_type: string
          produkt_id: string
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schema_markup?: Json | null
          slug?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          content?: Json | null
          created_at?: string
          freshness_score?: number | null
          generated_at?: string
          id?: string
          meta_desc?: string | null
          meta_title?: string | null
          next_review_at?: string | null
          page_type?: string
          produkt_id?: string
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
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
          akzeptierte_wartezeit_monate: number | null
          berufsklasse: string | null
          confluence_page_id: string | null
          confluence_synced: boolean
          convexa_error: string | null
          convexa_lead_id: string | null
          convexa_synced: boolean
          client_ip: string | null
          created_at: string
          email: string
          filter_kontext: Json | null
          geburtsdatum: string | null
          gewuenschter_anbieter: string | null
          id: string
          intent_tag: string | null
          interesse: string | null
          marketing_consent: boolean
          marketing_consent_at: string | null
          monatsbeitrag_eur: number | null
          nachname: string | null
          ort: string | null
          plz: string | null
          privacy_consent_at: string | null
          privacy_policy_version: string | null
          produkt_id: string | null
          resend_sent: boolean
          source_url: string | null
          sterbegeld_summe: number | null
          strasse: string | null
          telefon: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          vorname: string | null
          zielgruppe_tag: string | null
        }
        Insert: {
          akzeptierte_wartezeit_monate?: number | null
          berufsklasse?: string | null
          client_ip?: string | null
          confluence_page_id?: string | null
          confluence_synced?: boolean
          convexa_error?: string | null
          convexa_lead_id?: string | null
          convexa_synced?: boolean
          created_at?: string
          email: string
          filter_kontext?: Json | null
          geburtsdatum?: string | null
          gewuenschter_anbieter?: string | null
          id?: string
          intent_tag?: string | null
          interesse?: string | null
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          monatsbeitrag_eur?: number | null
          nachname?: string | null
          ort?: string | null
          plz?: string | null
          privacy_consent_at?: string | null
          privacy_policy_version?: string | null
          produkt_id?: string | null
          resend_sent?: boolean
          source_url?: string | null
          sterbegeld_summe?: number | null
          strasse?: string | null
          telefon?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vorname?: string | null
          zielgruppe_tag?: string | null
        }
        Update: {
          akzeptierte_wartezeit_monate?: number | null
          berufsklasse?: string | null
          client_ip?: string | null
          confluence_page_id?: string | null
          confluence_synced?: boolean
          convexa_error?: string | null
          convexa_lead_id?: string | null
          convexa_synced?: boolean
          created_at?: string
          email?: string
          filter_kontext?: Json | null
          geburtsdatum?: string | null
          gewuenschter_anbieter?: string | null
          id?: string
          intent_tag?: string | null
          interesse?: string | null
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          monatsbeitrag_eur?: number | null
          nachname?: string | null
          ort?: string | null
          plz?: string | null
          privacy_consent_at?: string | null
          privacy_policy_version?: string | null
          produkt_id?: string | null
          resend_sent?: boolean
          source_url?: string | null
          sterbegeld_summe?: number | null
          strasse?: string | null
          telefon?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
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
          accent_color: string | null
          brand_display_name: string | null
          brand_subline: string | null
          convexa_form_token: string | null
          created_at: string
          domain: string | null
          hero_image_alt: string | null
          hero_image_url: string | null
          id: string
          name: string
          navbar_logo_alt: string | null
          navbar_logo_url: string | null
          navbar_logo_visible: boolean
          og_image_url: string | null
          short_pitch: string | null
          slug: string
          standard_autor_id: string | null
          status: string
          style_description: string | null
          style_reference_url: string | null
          title_suffix_override: string | null
          typ: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          brand_display_name?: string | null
          brand_subline?: string | null
          convexa_form_token?: string | null
          created_at?: string
          domain?: string | null
          hero_image_alt?: string | null
          hero_image_url?: string | null
          id?: string
          name: string
          navbar_logo_alt?: string | null
          navbar_logo_url?: string | null
          navbar_logo_visible?: boolean
          og_image_url?: string | null
          short_pitch?: string | null
          slug: string
          standard_autor_id?: string | null
          status?: string
          style_description?: string | null
          style_reference_url?: string | null
          title_suffix_override?: string | null
          typ: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          brand_display_name?: string | null
          brand_subline?: string | null
          convexa_form_token?: string | null
          created_at?: string
          domain?: string | null
          hero_image_alt?: string | null
          hero_image_url?: string | null
          id?: string
          name?: string
          navbar_logo_alt?: string | null
          navbar_logo_url?: string | null
          navbar_logo_visible?: boolean
          og_image_url?: string | null
          short_pitch?: string | null
          slug?: string
          standard_autor_id?: string | null
          status?: string
          style_description?: string | null
          style_reference_url?: string | null
          title_suffix_override?: string | null
          typ?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produkte_standard_autor_id_fkey"
            columns: ["standard_autor_id"]
            isOneToOne: false
            referencedRelation: "redaktion"
            referencedColumns: ["id"]
          },
        ]
      }
      wissensfundus: {
        Row: {
          autor_id: string | null
          created_at: string
          freshness_score: number | null
          id: string
          inhalt: string
          kategorie: string
          link_phrases: string[] | null
          next_review_at: string | null
          published: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string | null
          tags: string[] | null
          thema: string
          updated_at: string
          wortzahl: number | null
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          freshness_score?: number | null
          id?: string
          inhalt: string
          kategorie: string
          link_phrases?: string[] | null
          next_review_at?: string | null
          published?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string | null
          tags?: string[] | null
          thema: string
          updated_at?: string
          wortzahl?: number | null
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          freshness_score?: number | null
          id?: string
          inhalt?: string
          kategorie?: string
          link_phrases?: string[] | null
          next_review_at?: string | null
          published?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string | null
          tags?: string[] | null
          thema?: string
          updated_at?: string
          wortzahl?: number | null
        }
        Relationships: []
      }
      redaktion: {
        Row: {
          artikel_anzahl: number
          created_at: string
          email: string | null
          expertise: string[] | null
          foto_alt: string | null
          foto_url: string | null
          id: string
          ihk_kammer: string | null
          jahre_erfahrung: number | null
          kurz_bio: string
          lang_bio_md: string
          linkedin_url: string | null
          nachname: string
          paragraph_34d: string | null
          public: boolean
          qualifikationen: string[] | null
          reviewed_anzahl: number
          rolle: string
          schema_person: Json | null
          slug: string
          telefon: string | null
          titel: string | null
          updated_at: string
          vermittlerregister_nr: string | null
          vorname: string
          website_url: string | null
          xing_url: string | null
        }
        Insert: {
          artikel_anzahl?: number
          created_at?: string
          email?: string | null
          expertise?: string[] | null
          foto_alt?: string | null
          foto_url?: string | null
          id?: string
          ihk_kammer?: string | null
          jahre_erfahrung?: number | null
          kurz_bio: string
          lang_bio_md: string
          linkedin_url?: string | null
          nachname: string
          paragraph_34d?: string | null
          public?: boolean
          qualifikationen?: string[] | null
          reviewed_anzahl?: number
          rolle: string
          schema_person?: Json | null
          slug: string
          telefon?: string | null
          titel?: string | null
          updated_at?: string
          vermittlerregister_nr?: string | null
          vorname: string
          website_url?: string | null
          xing_url?: string | null
        }
        Update: {
          artikel_anzahl?: number
          created_at?: string
          email?: string | null
          expertise?: string[] | null
          foto_alt?: string | null
          foto_url?: string | null
          id?: string
          ihk_kammer?: string | null
          jahre_erfahrung?: number | null
          kurz_bio?: string
          lang_bio_md?: string
          linkedin_url?: string | null
          nachname?: string
          paragraph_34d?: string | null
          public?: boolean
          qualifikationen?: string[] | null
          reviewed_anzahl?: number
          rolle?: string
          schema_person?: Json | null
          slug?: string
          telefon?: string | null
          titel?: string | null
          updated_at?: string
          vermittlerregister_nr?: string | null
          vorname?: string
          website_url?: string | null
          xing_url?: string | null
        }
        Relationships: []
      }
      trust_baustein: {
        Row: {
          aktiv: boolean
          autor_alter: string | null
          autor_name: string | null
          belegt_durch: string | null
          bild_alt: string | null
          bild_url: string | null
          body: string | null
          created_at: string
          id: string
          jahr: number | null
          produkt_id: string | null
          quelle_name: string | null
          quelle_url: string | null
          reihenfolge: number
          score: string | null
          slug: string
          titel: string
          typ: string
          updated_at: string
        }
        Insert: {
          aktiv?: boolean
          autor_alter?: string | null
          autor_name?: string | null
          belegt_durch?: string | null
          bild_alt?: string | null
          bild_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          jahr?: number | null
          produkt_id?: string | null
          quelle_name?: string | null
          quelle_url?: string | null
          reihenfolge?: number
          score?: string | null
          slug: string
          titel: string
          typ: string
          updated_at?: string
        }
        Update: {
          aktiv?: boolean
          autor_alter?: string | null
          autor_name?: string | null
          belegt_durch?: string | null
          bild_alt?: string | null
          bild_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          jahr?: number | null
          produkt_id?: string | null
          quelle_name?: string | null
          quelle_url?: string | null
          reihenfolge?: number
          score?: string | null
          slug?: string
          titel?: string
          typ?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_baustein_produkt_id_fkey"
            columns: ["produkt_id"]
            isOneToOne: false
            referencedRelation: "produkte"
            referencedColumns: ["id"]
          },
        ]
      }
      tarife: {
        Row: {
          alter_bis: number
          alter_von: number
          anbieter_name: string | null
          beitrag_high: number
          beitrag_low: number
          besonderheiten: Json | null
          created_at: string
          einheit: string
          id: string
          produkt_id: string
          summe: number
          tarif_name: string | null
          updated_at: string
        }
        Insert: {
          alter_bis: number
          alter_von: number
          anbieter_name?: string | null
          beitrag_high: number
          beitrag_low: number
          besonderheiten?: Json | null
          created_at?: string
          einheit?: string
          id?: string
          produkt_id: string
          summe: number
          tarif_name?: string | null
          updated_at?: string
        }
        Update: {
          alter_bis?: number
          alter_von?: number
          anbieter_name?: string | null
          beitrag_high?: number
          beitrag_low?: number
          besonderheiten?: Json | null
          created_at?: string
          einheit?: string
          id?: string
          produkt_id?: string
          summe?: number
          tarif_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarife_produkt_id_fkey"
            columns: ["produkt_id"]
            isOneToOne: false
            referencedRelation: "produkte"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string | null
          autor_id: string | null
          content_md: string
          cover_image_alt: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          freshness_score: number | null
          id: string
          kategorien: string[] | null
          meta_desc: string | null
          meta_title: string | null
          next_review_at: string | null
          produkt_id: string | null
          published_at: string | null
          reading_time: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          schema_markup: Json | null
          slug: string
          source_origin: string | null
          source_url: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          autor_id?: string | null
          content_md: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          freshness_score?: number | null
          id?: string
          kategorien?: string[] | null
          meta_desc?: string | null
          meta_title?: string | null
          next_review_at?: string | null
          produkt_id?: string | null
          published_at?: string | null
          reading_time?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schema_markup?: Json | null
          slug: string
          source_origin?: string | null
          source_url?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          autor_id?: string | null
          content_md?: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          freshness_score?: number | null
          id?: string
          kategorien?: string[] | null
          meta_desc?: string | null
          meta_title?: string | null
          next_review_at?: string | null
          produkt_id?: string | null
          published_at?: string | null
          reading_time?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schema_markup?: Json | null
          slug?: string
          source_origin?: string | null
          source_url?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_produkt_id_fkey"
            columns: ["produkt_id"]
            isOneToOne: false
            referencedRelation: "produkte"
            referencedColumns: ["id"]
          },
        ]
      }
      bilder: {
        Row: {
          alt_text: string
          blog_post_id: string | null
          created_at: string
          height: number | null
          id: string
          page_type: string | null
          produkt_id: string | null
          prompt_used: string | null
          provider: string
          slot: string | null
          url: string
          width: number | null
        }
        Insert: {
          alt_text: string
          blog_post_id?: string | null
          created_at?: string
          height?: number | null
          id?: string
          page_type?: string | null
          produkt_id?: string | null
          prompt_used?: string | null
          provider?: string
          slot?: string | null
          url: string
          width?: number | null
        }
        Update: {
          alt_text?: string
          blog_post_id?: string | null
          created_at?: string
          height?: number | null
          id?: string
          page_type?: string | null
          produkt_id?: string | null
          prompt_used?: string | null
          provider?: string
          slot?: string | null
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bilder_produkt_id_fkey"
            columns: ["produkt_id"]
            isOneToOne: false
            referencedRelation: "produkte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bilder_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      redirects: {
        Row: {
          legacy_path: string
          target_path: string
          status: number
          notiz: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          legacy_path: string
          target_path: string
          status?: number
          notiz?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          legacy_path?: string
          target_path?: string
          status?: number
          notiz?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      tarife_besonderheiten_aggregiert: {
        Row: {
          produkt_id: string
          anbieter_name: string
          tarif_name: string | null
          beitrag_min: number
          beitrag_max: number
          tarif_count: number
          gesundheitspruefung: boolean
          doppelte_unfall: boolean
          rueckholung: boolean
          lebenslang: boolean
          kindermitversicherung: boolean
          wartezeit_min_monate: number | null
          wartezeit_alt_monate: number | null
          zahlung_bis_alter: number | null
          alter_von_min: number
          alter_bis_max: number
          summe_min: number
          summe_max: number
        }
        Relationships: [
          {
            foreignKeyName: "tarife_produkt_id_fkey"
            columns: ["produkt_id"]
            isOneToOne: false
            referencedRelation: "produkte"
            referencedColumns: ["id"]
          },
        ]
      }
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
export type Redaktion = Database['public']['Tables']['redaktion']['Row']
export type RedaktionInsert = Database['public']['Tables']['redaktion']['Insert']
export type RedaktionUpdate = Database['public']['Tables']['redaktion']['Update']
export type TrustBaustein = Database['public']['Tables']['trust_baustein']['Row']
export type TrustBausteinInsert = Database['public']['Tables']['trust_baustein']['Insert']
export type TrustBausteinTyp =
  | 'pressezitat'
  | 'siegel'
  | 'kunden_review'
  | 'partner_logo'
  | 'zahl'
  | 'auszeichnung'
  | 'verband'
export type BlogPost = Database['public']['Tables']['blog_posts']['Row']
export type Redirect = Database['public']['Tables']['redirects']['Row']
export type RedirectInsert = Database['public']['Tables']['redirects']['Insert']
export type RedirectUpdate = Database['public']['Tables']['redirects']['Update']

export interface ActionResult<T = null> {
  success: boolean
  data?: T
  error?: string
  fieldErrors?: Record<string, string | string[]>
}
