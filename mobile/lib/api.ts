import * as SecureStore from 'expo-secure-store';

// Supports both EAS env vars (EXPO_PUBLIC_*) and app.json extra for local dev
const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('auth_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);
  return data as T;
}

// Auth
export const api = {
  login: (identifier: string, password: string) =>
    request<{ token: string; user: User }>('/api/mobile/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    }),

  // Dashboard
  getDashboard: () => request<DashboardData>('/api/mobile/dashboard'),

  // Stock
  getStock: () => request<StockData>('/api/mobile/stock'),
  createProduct: (data: CreateProductPayload) =>
    request<{ product: Product }>('/api/mobile/stock', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Suppliers
  getSuppliers: () => request<{ suppliers: Supplier[] }>('/api/mobile/suppliers'),
  createSupplier: (data: CreateSupplierPayload) =>
    request<{ supplier: Supplier }>('/api/mobile/suppliers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Purchases
  getPurchases: () => request<{ purchases: Purchase[] }>('/api/mobile/purchase'),
  createPurchase: (data: CreatePurchasePayload) =>
    request<{ success: boolean; purchaseId: string; total: number }>('/api/mobile/purchase', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Sales
  getSales: () => request<{ sales: Sale[] }>('/api/mobile/sales'),
  createSale: (data: CreateSalePayload) =>
    request<{ success: boolean; saleId: string; subtotal: number; tax: number; total: number }>(
      '/api/mobile/sales',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  // Notifications
  getNotifications: () => request<{ notifications: Notification[] }>('/api/mobile/notifications'),

  // Settings
  getSettings: () => request<{ currency: string; currencyOptions: string[] }>('/api/mobile/settings'),
  updateSettings: (currency: string) =>
    request<{ currency: string }>('/api/mobile/settings', {
      method: 'PUT',
      body: JSON.stringify({ currency })
    })
};

// Types
export type User = {
  id: string;
  name: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  email: string | null;
  phone: string | null;
};

export type LowStockItem = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  reorderLevel: number;
};

export type DashboardData = {
  productCount: number;
  lowStockCount: number;
  salesToday: number;
  purchasesToday: number;
  currency: string;
  lowStockItems: LowStockItem[];
  userName: string;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  quantity: number;
  reorderLevel: number;
  createdAt: string;
};

export type StockData = {
  products: Product[];
  currency: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
};

export type PurchaseItem = {
  id: string;
  productId: string;
  quantity: number;
  costPrice: number;
  product: { name: string; sku: string };
};

export type Purchase = {
  id: string;
  createdAt: string;
  total: number;
  supplier: { name: string };
  user: { name: string };
  items: PurchaseItem[];
};

export type SaleItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product: { name: string; sku: string };
};

export type Sale = {
  id: string;
  createdAt: string;
  customer: string;
  subtotal: number;
  tax: number;
  total: number;
  user: { name: string };
  items: SaleItem[];
};

export type Notification = {
  id: string;
  createdAt: string;
  message: string;
  type: 'STOCK_LOW' | 'PURCHASE_LOGGED' | 'SALE_BILL';
};

export type CreateProductPayload = {
  name: string;
  sku: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  quantity: number;
  reorderLevel: number;
};

export type CreateSupplierPayload = {
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
};

export type CreatePurchasePayload = {
  supplierId: string;
  items: { productId: string; quantity: number; costPrice: number }[];
};

export type CreateSalePayload = {
  customer: string;
  taxRate: number;
  items: { productId: string; quantity: number; unitPrice: number }[];
};
