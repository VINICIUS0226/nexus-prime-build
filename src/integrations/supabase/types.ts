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
      customer_catalogs: {
        Row: {
          created_at: string
          customer_id: string | null
          filters: Json | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          filters?: Json | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          filters?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_catalogs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          cep: string | null
          city: string | null
          complement: string | null
          cpf: string | null
          created_at: string
          data_consent: boolean
          email: string | null
          full_name: string
          id: string
          neighborhood: string | null
          number: string | null
          phone: string
          state: string | null
          store_id: string | null
          street: string | null
          updated_at: string
          user_type: Database["public"]["Enums"]["customer_type"]
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          data_consent?: boolean
          email?: string | null
          full_name: string
          id?: string
          neighborhood?: string | null
          number?: string | null
          phone: string
          state?: string | null
          store_id?: string | null
          street?: string | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["customer_type"]
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          data_consent?: boolean
          email?: string | null
          full_name?: string
          id?: string
          neighborhood?: string | null
          number?: string | null
          phone?: string
          state?: string | null
          store_id?: string | null
          street?: string | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["customer_type"]
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_configs: {
        Row: {
          base_value: number
          calculation_rule: Database["public"]["Enums"]["freight_calculation_rule"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          base_value?: number
          calculation_rule?: Database["public"]["Enums"]["freight_calculation_rule"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          base_value?: number
          calculation_rule?: Database["public"]["Enums"]["freight_calculation_rule"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          external_transaction_id: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string | null
          sale_id: string
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          external_transaction_id?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          sale_id: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          external_transaction_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          sale_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_primary: boolean
          product_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_primary?: boolean
          product_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          is_verified_purchase: boolean
          product_id: string
          rating: number
          title: string | null
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_verified_purchase?: boolean
          product_id: string
          rating: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_verified_purchase?: boolean
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          color: string | null
          cost_price: number | null
          created_at: string
          id: string
          min_stock_level: number | null
          product_id: string
          reserved_quantity: number
          selling_price: number | null
          size: string | null
          sku: string
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          cost_price?: number | null
          created_at?: string
          id?: string
          min_stock_level?: number | null
          product_id: string
          reserved_quantity?: number
          selling_price?: number | null
          size?: string | null
          sku: string
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          cost_price?: number | null
          created_at?: string
          id?: string
          min_stock_level?: number | null
          product_id?: string
          reserved_quantity?: number
          selling_price?: number | null
          size?: string | null
          sku?: string
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          profit_margin: number | null
          selling_price: number | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          profit_margin?: number | null
          selling_price?: number | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          profit_margin?: number | null
          selling_price?: number | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          must_change_password: boolean
          phone: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          must_change_password?: boolean
          phone?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          phone?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_items: {
        Row: {
          created_at: string
          id: string
          is_returned: boolean
          quantity: number
          reservation_id: string
          unit_price: number
          variation_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_returned?: boolean
          quantity?: number
          reservation_id: string
          unit_price: number
          variation_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_returned?: boolean
          quantity?: number
          reservation_id?: string
          unit_price?: number
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_items_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          bag_code: string | null
          created_at: string
          created_by: string
          customer_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          store_id: string | null
          updated_at: string
        }
        Insert: {
          bag_code?: string | null
          created_at?: string
          created_by: string
          customer_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          bag_code?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          created_by: string
          customer_id: string
          discount: number
          freight_config_id: string | null
          freight_value: number
          id: string
          notes: string | null
          reservation_id: string | null
          store_id: string | null
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_id: string
          discount?: number
          freight_config_id?: string | null
          freight_value?: number
          id?: string
          notes?: string | null
          reservation_id?: string | null
          store_id?: string | null
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_id?: string
          discount?: number
          freight_config_id?: string | null
          freight_value?: number
          id?: string
          notes?: string | null
          reservation_id?: string | null
          store_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_freight_config_id_fkey"
            columns: ["freight_config_id"]
            isOneToOne: false
            referencedRelation: "freight_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          store_id: string | null
          config_key: string
          config_value: string | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          store_id?: string | null
          config_key: string
          config_value?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          store_id?: string | null
          config_key?: string
          config_value?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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
      get_user_store_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      customer_type: "client" | "seller" | "manager"
      freight_calculation_rule:
        | "fixed"
        | "by_zip"
        | "by_weight"
        | "by_value"
        | "free"
      payment_method:
        | "pix"
        | "credit_card"
        | "debit_card"
        | "cash"
        | "bank_slip"
      payment_status: "pending" | "approved" | "rejected" | "cancelled"
      reservation_status:
        | "active"
        | "in_client_possession"
        | "returned"
        | "awaiting_payment"
        | "completed"
        | "cancelled"
      user_role: "admin" | "employee" | "super_admin"
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
      customer_type: ["client", "seller", "manager"],
      freight_calculation_rule: [
        "fixed",
        "by_zip",
        "by_weight",
        "by_value",
        "free",
      ],
      payment_method: ["pix", "credit_card", "debit_card", "cash", "bank_slip"],
      payment_status: ["pending", "approved", "rejected", "cancelled"],
      reservation_status: [
        "active",
        "in_client_possession",
        "returned",
        "awaiting_payment",
        "completed",
        "cancelled",
      ],
      user_role: ["admin", "employee", "super_admin"],
    },
  },
} as const
