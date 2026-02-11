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
      annual_report_inventory: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          fiscal_year: number
          id: string
          notes: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          description: string
          fiscal_year: number
          id?: string
          notes?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          fiscal_year?: number
          id?: string
          notes?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      budget: {
        Row: {
          budgeted_amount: number
          category: string
          created_at: string
          description: string
          fiscal_year: number
          id: string
          notes: string | null
          realized_amount: number
          section: string
          updated_at: string
        }
        Insert: {
          budgeted_amount?: number
          category: string
          created_at?: string
          description: string
          fiscal_year: number
          id?: string
          notes?: string | null
          realized_amount?: number
          section: string
          updated_at?: string
        }
        Update: {
          budgeted_amount?: number
          category?: string
          created_at?: string
          description?: string
          fiscal_year?: number
          id?: string
          notes?: string | null
          realized_amount?: number
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          bank_account: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          enterprise_number: string | null
          id: string
          is_supplier: boolean | null
          name: string
          phone: string | null
          postal_code: string | null
          updated_at: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          enterprise_number?: string | null
          id?: string
          is_supplier?: boolean | null
          name: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          enterprise_number?: string | null
          id?: string
          is_supplier?: boolean | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          member_id: string | null
          mollie_payment_id: string | null
          mollie_status: string | null
          paid_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          member_id?: string | null
          mollie_payment_id?: string | null
          mollie_status?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          member_id?: string | null
          mollie_payment_id?: string | null
          mollie_status?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          member_id: string
          registered_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          member_id: string
          registered_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          member_id?: string
          registered_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string
          id: string
          is_published: boolean
          location: string | null
          max_participants: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date: string
          id?: string
          is_published?: boolean
          location?: string | null
          max_participants?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string
          id?: string
          is_published?: boolean
          location?: string | null
          max_participants?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          company_id: string | null
          created_at: string | null
          date: string
          description: string
          id: string
          member_id: string | null
          notes: string | null
          receipt_url: string | null
          type: string
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          amount: number
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          date?: string
          description: string
          id?: string
          member_id?: string | null
          notes?: string | null
          receipt_url?: string | null
          type: string
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          receipt_url?: string | null
          type?: string
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      income: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string | null
          date: string
          description: string
          id: string
          member_id: string | null
          notes: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string | null
          date?: string
          description: string
          id?: string
          member_id?: string | null
          notes?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "income_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          sort_order: number
          total: number
          unit_price: number
          updated_at: string
          vat_rate: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          sort_order?: number
          total?: number
          unit_price?: number
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          sort_order?: number
          total?: number
          unit_price?: number
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_id: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          invoice_sequence: number
          invoice_year: number
          last_reminder_at: string | null
          member_id: string | null
          notes: string | null
          paid_amount: number
          paid_at: string | null
          pdf_url: string | null
          reminder_count: number
          sent_at: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          invoice_date?: string
          invoice_number: string
          invoice_sequence: number
          invoice_year?: number
          last_reminder_at?: string | null
          member_id?: string | null
          notes?: string | null
          paid_amount?: number
          paid_at?: string | null
          pdf_url?: string | null
          reminder_count?: number
          sent_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_sequence?: number
          invoice_year?: number
          last_reminder_at?: string | null
          member_id?: string | null
          notes?: string | null
          paid_amount?: number
          paid_at?: string | null
          pdf_url?: string | null
          reminder_count?: number
          sent_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      mailing_assets: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string
          type: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label: string
          type: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string
          type?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      mailing_templates: {
        Row: {
          created_at: string
          html_content: string
          id: string
          name: string
          subject: string
          text_content: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          html_content: string
          id?: string
          name: string
          subject: string
          text_content?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          html_content?: string
          id?: string
          name?: string
          subject?: string
          text_content?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mailings: {
        Row: {
          created_at: string
          filter_city: string | null
          filter_company_id: string | null
          filter_membership_type: string | null
          filter_status: string | null
          id: string
          scheduled_at: string | null
          selected_member_ids: string[] | null
          selection_type: string
          sent_at: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          filter_city?: string | null
          filter_company_id?: string | null
          filter_membership_type?: string | null
          filter_status?: string | null
          id?: string
          scheduled_at?: string | null
          selected_member_ids?: string[] | null
          selection_type: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          filter_city?: string | null
          filter_company_id?: string | null
          filter_membership_type?: string | null
          filter_status?: string | null
          id?: string
          scheduled_at?: string | null
          selected_member_ids?: string[] | null
          selection_type?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mailings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "mailing_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      member_tags: {
        Row: {
          created_at: string
          id: string
          member_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_tags_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          auth_user_id: string | null
          bank_account: string | null
          city: string | null
          company_id: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          facebook_url: string | null
          first_name: string
          id: string
          instagram_url: string | null
          is_active: boolean | null
          is_active_member: boolean | null
          is_admin: boolean
          is_ambassador: boolean | null
          is_board_member: boolean | null
          is_council_member: boolean | null
          is_donor: boolean | null
          last_name: string
          linkedin_url: string | null
          member_since: string | null
          mobile: string | null
          notes: string | null
          password_change_required: boolean
          personal_url: string | null
          phone: string | null
          postal_code: string | null
          profile_photo_url: string | null
          receives_mail: boolean | null
          tiktok_url: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          bank_account?: string | null
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          facebook_url?: string | null
          first_name: string
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          is_active_member?: boolean | null
          is_admin?: boolean
          is_ambassador?: boolean | null
          is_board_member?: boolean | null
          is_council_member?: boolean | null
          is_donor?: boolean | null
          last_name: string
          linkedin_url?: string | null
          member_since?: string | null
          mobile?: string | null
          notes?: string | null
          password_change_required?: boolean
          personal_url?: string | null
          phone?: string | null
          postal_code?: string | null
          profile_photo_url?: string | null
          receives_mail?: boolean | null
          tiktok_url?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          bank_account?: string | null
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          facebook_url?: string | null
          first_name?: string
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          is_active_member?: boolean | null
          is_admin?: boolean
          is_ambassador?: boolean | null
          is_board_member?: boolean | null
          is_council_member?: boolean | null
          is_donor?: boolean | null
          last_name?: string
          linkedin_url?: string | null
          member_since?: string | null
          mobile?: string | null
          notes?: string | null
          password_change_required?: boolean
          personal_url?: string | null
          phone?: string | null
          postal_code?: string | null
          profile_photo_url?: string | null
          receives_mail?: boolean | null
          tiktok_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
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
      companies_public: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string | null
          is_supplier: boolean | null
          name: string | null
          postal_code: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string | null
          is_supplier?: boolean | null
          name?: string | null
          postal_code?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string | null
          is_supplier?: boolean | null
          name?: string | null
          postal_code?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_invoice_number: { Args: { p_year: number }; Returns: string }
      get_my_member_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_linked_to_company: { Args: { _company_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "member"
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
      app_role: ["admin", "member"],
    },
  },
} as const
