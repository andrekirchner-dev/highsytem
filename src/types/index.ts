export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  sku?: string;
  costPrice: number;
  salePrice: number;
  stockQty: number;
  minStock: number;
  imageUrl?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'debito' | 'credito';

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  paymentMethod: PaymentMethod;
  createdAt: Date;
  userId: string;
}

export type MovementType = 'entrada' | 'saida' | 'ajuste' | 'venda';

export interface StockMovement {
  id: string;
  productId: string;
  type: MovementType;
  qty: number;
  reason: string;
  createdAt: Date;
  userId: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'operador';
}

export interface CartItem {
  product: Product;
  qty: number;
}
