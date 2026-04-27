export const JEWELRY_CATEGORIES = ["Jewellery", "Jewelry", "Accessories"];

export const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export interface Product {
  id: string;
  name: string;
  price: number;       // selling price — shown to customers
  costPrice?: number;  // buying/Meesho price — admin only
  meeshoUrl?: string;  // Meesho source URL — admin only
  description: string;
  image: string;
  images: string[];
  category: string;
  inStock: boolean;
  quantity: number;
  sizes?: string[];
}

export interface CartItem extends Product {
  cartQuantity: number;
  selectedSize?: string;
}
