// ECサイト用型定義

export interface Product {
  _id: string;
  name: string;
  slug: {
    current: string;
  };
  description: string;
  images: Array<{
    asset: {
      _ref: string;
      url?: string;
    };
    alt?: string;
  }>;
  price: number;
  compareAtPrice?: number;
  size: string;
  materials: string[];
  category: {
    _ref: string;
    title?: string;
  };
  inStock: boolean;
  stockQuantity: number;
  careInstructions: string;
  variants?: ProductVariant[];
  weight?: number;
  shippingInfo?: string;
  featured?: boolean;
}

export interface ProductVariant {
  _key: string;
  name: string;
  price: number;
  stockQuantity: number;
  image?: {
    asset: {
      _ref: string;
      url?: string;
    };
    alt?: string;
  };
}

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: ProductVariant;
  price: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  baseShippingCost?: number;
  shippingDiscount?: number;
  shippingMethod?: ShippingMethod;
  tax: number;
  total: number;
  itemCount: number;
}

export interface Customer {
  _id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address: Address;
  orderHistory?: Order[];
  membershipLevel?: 'standard' | 'premium' | 'vip';
  preferences?: CustomerPreferences;
  createdAt?: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CustomerPreferences {
  newsletter: boolean;
  promotions: boolean;
  deliveryInstructions?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerId: string;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingAddress: Address;
  billingAddress: Address;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  notes?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
}

export interface OrderItem {
  product: {
    _id: string;
    name: string;
    slug: string;
    image?: string;
  };
  variant?: {
    _key: string;
    name: string;
  };
  quantity: number;
  price: number;
  total: number;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: number;
}

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'bank_transfer' | 'cash_on_delivery' | 'paypal';
  name: string;
  description?: string;
}

export interface CartSession {
  sessionId: string;
  items: CartItem[];
  subtotal: number;
  shippingMethod?: ShippingMethod;
  discounts?: Discount[];
  expiresAt: string;
}

export interface Discount {
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  description: string;
  minimumAmount?: number;
  expiresAt?: string;
}

export interface Inventory {
  productId: string;
  quantity: number;
  reserved: number;
  available: number;
  reorderLevel: number;
  supplier?: string;
  lastUpdated: string;
}

// フォーム用型定義
export interface CheckoutFormData {
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  shippingAddress: Address;
  billingAddress: Address;
  sameAsShipping: boolean;
  shippingMethod: string;
  paymentMethod: string;
  notes?: string;
  newsletter: boolean;
  terms: boolean;
}

// 配送計算結果型定義
export interface ShippingCalculationResult {
  baseShippingCost: number;
  finalShippingCost: number;
  shippingDiscount: number;
  tax: number;
  total: number;
  shippingDetails?: ShippingDetails;
}

export interface ShippingDetails {
  yupackSize?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  totalWeight?: number;
  packagingWeight?: number;
  hasFragile?: boolean;
  specialInstructions?: string[];
  maxSize?: number;
  baseCost?: number;
  totalCost: number;
  breakdown?: {
    base: number;
    packaging: number;
    speed: number;
    discount?: number;
  };
  debug?: {
    totalDimension: number;
    sizeLimit: {
      maxDimension: number;
      maxWeight: number;
    };
  };
  error?: string;
}

// API レスポンス用型定義
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}