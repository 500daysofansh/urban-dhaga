import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import CheckoutModal from "@/components/CheckoutModal";

const Cart = () => {
  const { items, updateQuantity, removeFromCart, clearCart, totalPrice } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const handleCheckout = () => {
    if (!user) {
      toast.error("Please login to proceed with checkout");
      navigate("/login");
      return;
    }
    setCheckoutOpen(true);
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-20">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold text-foreground">Your cart is empty</h2>
          <p className="text-muted-foreground">Looks like you haven't added anything yet.</p>
          <Link to="/">
            <Button className="mt-2 gap-2">
              <ArrowLeft className="h-4 w-4" /> Continue Shopping
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Shopping Cart</h1>
          <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground">
            Clear All
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Cart items */}
          <div className="space-y-4 lg:col-span-2">
            {items.map((item) => (
              <Card key={`${item.id}-${item.selectedSize || ""}`} className="overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex gap-3 sm:gap-4">
                    {/* Product image */}
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-20 w-20 shrink-0 rounded-lg object-cover sm:h-24 sm:w-24"
                    />

                    {/* Details + controls */}
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      {/* Name + category */}
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-foreground">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.category}
                          {item.selectedSize && (
                            <span className="ml-2">· Size: {item.selectedSize}</span>
                          )}
                        </p>
                      </div>

                      {/* FIX: quantity stepper + price + delete on separate rows on mobile */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Quantity stepper */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() => updateQuantity(item.id, -1, item.selectedSize)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-7 text-center text-sm font-medium">
                            {item.cartQuantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() => updateQuantity(item.id, 1, item.selectedSize)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Price + delete */}
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            ₹{(item.price * item.cartQuantity).toLocaleString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive sm:h-8 sm:w-8"
                            onClick={() => removeFromCart(item.id, item.selectedSize)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order summary */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₹{totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span className="text-primary">Free</span>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="flex justify-between font-semibold text-foreground">
                <span>Total</span>
                <span>₹{totalPrice.toLocaleString()}</span>
              </div>
              <Button className="mt-6 w-full" size="lg" onClick={handleCheckout}>
                Proceed to Checkout
              </Button>
              <Link to="/">
                <Button variant="ghost" className="mt-2 w-full gap-2" size="sm">
                  <ArrowLeft className="h-4 w-4" /> Continue Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        userEmail={user?.email || ""}
      />
    </div>
  );
};

export default Cart;
