import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag, ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import CheckoutModal from "@/components/CheckoutModal";

const Cart = () => {
  const { items, updateQuantity, removeFromCart, clearCart, totalPrice } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

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

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8 sm:px-6 lg:px-8
                       /* bottom padding on mobile so sticky bar doesn't overlap content */
                       pb-32 sm:pb-8">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            Shopping Cart
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({items.length} {items.length === 1 ? "item" : "items"})
            </span>
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="shrink-0 text-muted-foreground text-xs"
          >
            Clear All
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Cart items ───────────────────────────────────────────── */}
          <div className="space-y-3 lg:col-span-2">
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
                        <h3 className="truncate font-semibold text-foreground leading-snug">
                          {item.name}
                        </h3>
                        <p className="text-xs text-muted-foreground sm:text-sm">
                          {item.category}
                          {item.selectedSize && (
                            <span className="ml-1.5">· Size: {item.selectedSize}</span>
                          )}
                        </p>
                      </div>

                      {/* Quantity stepper + price + delete */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Stepper — larger touch targets on mobile */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => updateQuantity(item.id, -1, item.selectedSize)}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium tabular-nums">
                            {item.cartQuantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => updateQuantity(item.id, 1, item.selectedSize)}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Price + delete */}
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground text-sm sm:text-base tabular-nums">
                            ₹{(item.price * item.cartQuantity).toLocaleString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeFromCart(item.id, item.selectedSize)}
                            aria-label={`Remove ${item.name}`}
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

            {/* Continue shopping — visible on mobile below items */}
            <Link to="/" className="block sm:hidden">
              <Button variant="ghost" className="w-full gap-2 text-muted-foreground" size="sm">
                <ArrowLeft className="h-4 w-4" /> Continue Shopping
              </Button>
            </Link>
          </div>

          {/* ── Order summary (desktop sidebar) ─────────────────────── */}
          <Card className="hidden lg:block self-start sticky top-4">
            <CardContent className="p-4 sm:p-6">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₹{totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span className="text-primary font-medium">Free</span>
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

      {/* ── Sticky bottom bar (mobile only) ─────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-card border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>

        {/* Expandable summary drawer */}
        {summaryExpanded && (
          <div className="px-4 pt-4 pb-2 space-y-2 text-sm border-b border-border/60">
            {items.map((item) => (
              <div key={`${item.id}-${item.selectedSize}`} className="flex justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate min-w-0">
                  {item.name}
                  {item.selectedSize ? ` (${item.selectedSize})` : ""}
                  {" "}× {item.cartQuantity}
                </span>
                <span className="shrink-0 tabular-nums">
                  ₹{(item.price * item.cartQuantity).toLocaleString()}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-xs text-muted-foreground pt-1">
              <span>Shipping</span>
              <span className="text-primary font-medium">Free</span>
            </div>
          </div>
        )}

        {/* Total row + CTA */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Total + expand toggle */}
          <button
            className="flex flex-1 items-center gap-1.5 min-w-0"
            onClick={() => setSummaryExpanded((v) => !v)}
            aria-label={summaryExpanded ? "Collapse order summary" : "Expand order summary"}
          >
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-0.5">
                Total
              </p>
              <p className="font-bold text-foreground tabular-nums">
                ₹{totalPrice.toLocaleString()}
              </p>
            </div>
            <ChevronDown
              className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                summaryExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Checkout CTA */}
          <Button
            className="shrink-0 rounded-full px-6 py-2.5 text-sm font-semibold"
            onClick={handleCheckout}
          >
            Checkout →
          </Button>
        </div>
      </div>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        userEmail={user?.email ?? null}
      />
    </div>
  );
};

export default Cart;
