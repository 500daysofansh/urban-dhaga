import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CartItem, Product } from "@/types/product";

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, selectedSize?: string) => void;
  removeFromCart: (id: string, selectedSize?: string) => void;
  updateQuantity: (id: string, change: number, selectedSize?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = "urban-Dhage-cart";

const getCartKey = (id: string, size?: string) => `${id}-${size || "nosize"}`;

const loadCart = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = useCallback((product: Product, selectedSize?: string) => {
    setItems((prev) => {
      const existing = prev.find(
        (item) => item.id === product.id && item.selectedSize === selectedSize
      );
      if (existing) {
        return prev.map((item) =>
          item.id === product.id && item.selectedSize === selectedSize
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, cartQuantity: 1, selectedSize }];
    });
  }, []);

  const removeFromCart = useCallback((id: string, selectedSize?: string) => {
    setItems((prev) =>
      prev.filter((item) => !(item.id === id && item.selectedSize === selectedSize))
    );
  }, []);

  const updateQuantity = useCallback((id: string, change: number, selectedSize?: string) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.id === id && item.selectedSize === selectedSize
            ? { ...item, cartQuantity: item.cartQuantity + change }
            : item
        )
        .filter((item) => item.cartQuantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, item) => sum + item.cartQuantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
