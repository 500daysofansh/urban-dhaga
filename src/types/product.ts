export const JEWELRY_CATEGORIES = ["Jewellery", "Jewelry", "Accessories"];

export const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export interface Product {
  id: string;
  name: string;
  price: number;
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
