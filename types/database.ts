export type UserRole = "vendeur" | "producteur" | "gerant";
export type PosType = "boutique" | "marche" | "stand" | "autre";
export type IngredientUnit = "g" | "kg" | "ml" | "l" | "piece";
export type BatchStatus = "en_stock" | "epuise" | "perime";
export type TransferStatus = "envoye" | "recu" | "annule";
export type PaymentMethod = "especes" | "cb";
export type LossReason = "perime" | "casse" | "invendu" | "autre";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          point_of_sale_id: string | null;
          is_active: boolean;
          created_at: string;
          caisse_pin_hash: string | null;
          caisse_pin_is_set: boolean;
        };
        Insert: {
          id: string;
          full_name: string;
          role: UserRole;
          point_of_sale_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          caisse_pin_hash?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      points_of_sale: {
        Row: {
          id: string;
          name: string;
          type: PosType;
          address: string | null;
          photo_path: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: PosType;
          address?: string | null;
          photo_path?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["points_of_sale"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price_cents: number;
          photo_path: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price_cents: number;
          photo_path?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      ingredients: {
        Row: {
          id: string;
          name: string;
          unit: IngredientUnit;
          cost_per_unit_cents: number;
          stock_quantity: number;
          low_stock_threshold: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          unit: IngredientUnit;
          cost_per_unit_cents: number;
          stock_quantity?: number;
          low_stock_threshold?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ingredients"]["Insert"]>;
      };
      recipes: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          steps: string | null;
          batch_yield: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          steps?: string | null;
          batch_yield: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipes"]["Insert"]>;
      };
      recipe_ingredients: {
        Row: {
          id: string;
          recipe_id: string;
          ingredient_id: string;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          ingredient_id: string;
          quantity: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["recipe_ingredients"]["Insert"]
        >;
      };
      production_batches: {
        Row: {
          id: string;
          recipe_id: string;
          product_id: string;
          produced_by: string;
          quantity_produced: number;
          produced_at: string;
          expiry_date: string;
          status: BatchStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          product_id: string;
          produced_by: string;
          quantity_produced: number;
          produced_at?: string;
          expiry_date: string;
          status?: BatchStatus;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["production_batches"]["Insert"]
        >;
      };
      stock_items: {
        Row: {
          id: string;
          point_of_sale_id: string | null;
          product_id: string;
          batch_id: string | null;
          quantity: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          point_of_sale_id?: string | null;
          product_id: string;
          batch_id?: string | null;
          quantity?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stock_items"]["Insert"]>;
      };
      transfers: {
        Row: {
          id: string;
          product_id: string;
          batch_id: string | null;
          quantity: number;
          from_point_of_sale_id: string | null;
          to_point_of_sale_id: string;
          status: TransferStatus;
          sent_by: string;
          sent_at: string;
          received_by: string | null;
          received_at: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          batch_id?: string | null;
          quantity: number;
          from_point_of_sale_id?: string | null;
          to_point_of_sale_id: string;
          status?: TransferStatus;
          sent_by: string;
          sent_at?: string;
          received_by?: string | null;
          received_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["transfers"]["Insert"]>;
      };
      sales: {
        Row: {
          id: string;
          point_of_sale_id: string;
          sold_by: string;
          total_cents: number;
          payment_method: PaymentMethod;
          sold_at: string;
          synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          point_of_sale_id: string;
          sold_by: string;
          total_cents: number;
          payment_method: PaymentMethod;
          sold_at: string;
          synced_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sales"]["Insert"]>;
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          unit_price_cents: number;
        };
        Insert: {
          id?: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          unit_price_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["sale_items"]["Insert"]>;
      };
      losses: {
        Row: {
          id: string;
          point_of_sale_id: string | null;
          product_id: string;
          batch_id: string | null;
          quantity: number;
          reason: LossReason;
          recorded_by: string;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          point_of_sale_id?: string | null;
          product_id: string;
          batch_id?: string | null;
          quantity: number;
          reason: LossReason;
          recorded_by: string;
          recorded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["losses"]["Insert"]>;
      };
    };
    Functions: {
      set_caisse_pin: {
        Args: { p_profile_id: string; p_pin: string };
        Returns: undefined;
      };
      verify_caisse_pin: {
        Args: { p_pin: string; p_point_of_sale_id: string };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      pos_type: PosType;
      ingredient_unit: IngredientUnit;
      batch_status: BatchStatus;
      transfer_status: TransferStatus;
      payment_method: PaymentMethod;
      loss_reason: LossReason;
    };
  };
};
