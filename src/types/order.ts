export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderItem {
  name: string;
  price: number;
  cartQuantity: number;
  selectedSize?: string;
  image?: string;
}

export type OrderStatus =
  | "order_placed"       // auto-triggered when customer pays
  | "meesho_ordered"     // admin manually marks: order placed on Meesho
  | "order_processed"    // admin manually marks: order confirmed & processing
  | "order_shipped"      // admin manually marks: shipped
  | "out_for_delivery"   // admin manually marks: out for delivery
  | "order_delivered";   // admin manually marks: delivered

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  paymentId: string;
  amount: number;
  address: ShippingAddress;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: number;        // Unix timestamp ms
  updatedAt: number;
  statusHistory: {
    status: OrderStatus;
    timestamp: number;
    note?: string;
  }[];
}
