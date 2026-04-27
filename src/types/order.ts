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
}