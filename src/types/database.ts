export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      inventory_items: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          brand: string | null;
          barcode: string | null;
          quantity: number;
          unit: string;
          category: string | null;
          notes: string | null;
          image_url: string | null;
          calories: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          serving_size_g: number | null;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          brand?: string | null;
          barcode?: string | null;
          quantity?: number;
          unit?: string;
          category?: string | null;
          notes?: string | null;
          image_url?: string | null;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          serving_size_g?: number | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          brand?: string | null;
          barcode?: string | null;
          quantity?: number;
          unit?: string;
          category?: string | null;
          notes?: string | null;
          image_url?: string | null;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          serving_size_g?: number | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
export type InventoryItemInsert =
  Database['public']['Tables']['inventory_items']['Insert'];
export type InventoryItemUpdate =
  Database['public']['Tables']['inventory_items']['Update'];
export type AuthProfile = Database['public']['Tables']['profiles']['Row'];
