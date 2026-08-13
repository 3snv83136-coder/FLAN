import type { PaymentMethod, UserRole } from "@/types/database";

export type SaleProduct = {
  id: string;
  name: string;
  price_cents: number;
  stock_quantity: number;
};

export type CartLine = {
  product_id: string;
  name: string;
  unit_price_cents: number;
  quantity: number;
};

export type PendingSaleItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price_cents: number;
};

export type PendingSale = {
  id: string;
  point_of_sale_id: string;
  sold_by: string;
  total_cents: number;
  payment_method: PaymentMethod;
  sold_at: string;
  items: PendingSaleItem[];
};

export type AppProfile = {
  id: string;
  full_name: string;
  role: UserRole;
  point_of_sale_id: string | null;
};
