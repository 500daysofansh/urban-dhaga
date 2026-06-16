import { Link, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowLeft, Package, MapPin, Truck, CreditCard, Hash, Copy } from "lucide-react";
import { ShippingAddress } from "@/types/order";
import { toast } from "sonner";

const OrderConfirmation = () => {
  const location = useLocation();
  const {
    orderId,
    paymentId,
    amount,
    deliveryCharge,
    subtotalDiscount,
    promoCode,
    paymentMethod,
    items,
    address,
  } = (location.state as {
    orderId: string;
    paymentId: string;
    amount: number;
    deliveryCharge?: number;
    subtotalDiscount?: number;
    promoCode?: string | null;
    paymentMethod?: "cod" | "online";
    address: ShippingAddress;
    items: { name: string; cartQuantity: number; price: number; selectedSize?: string }[];
  }) || { orderId: "", paymentId: "", amount: 0, deliveryCharge: 0, subtotalDiscount: 0, promoCode: null, paymentMethod: "online", items: [], address: null };

  const isCOD = paymentMethod === "cod";
  const subtotal = items?.reduce((sum, i) => sum + i.price * i.cartQuantity, 0) ?? 0;
  const charge = deliveryCharge ?? 0;
  const discount = subtotalDiscount ?? 0;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied!`);
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 py-12 sm:px-6">

        {/* Success header */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <CheckCircle className="h-16 w-16 text-primary" />
          <h1 className="text-2xl font-bold text-foreground font-heading">
            {isCOD ? "Order Placed!" : "Order Confirmed!"}
          </h1>
          <p className="text-muted-foreground font-body">
            {isCOD
              ? `Your order has been placed. Please keep ₹${amount.toLocaleString("en-IN")} ready at the time of delivery.`
              : "Thank you for your purchase. Your payment was successful."}
          </p>
        </div>

        <Card className="w-full">
          <CardContent className="space-y-4 p-6">

            {/* ── Order ID — prominent ── */}
            {orderId && (
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 px-4 py-3">
                <p className="mb-1 font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Order ID
                </p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-mono text-sm font-bold text-primary truncate">{orderId}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(orderId, "Order ID")}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    aria-label="Copy order ID"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1.5 font-body text-[11px] text-muted-foreground">
                  Save this ID to track or query your order
                </p>
              </div>
            )}

            {/* Payment info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-body">Payment Method</span>
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                {isCOD
                  ? <><Truck className="h-3.5 w-3.5" /> Cash on Delivery</>
                  : <><CreditCard className="h-3.5 w-3.5" /> Online Payment</>
                }
              </span>
            </div>

            {!isCOD && paymentId && (
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-muted-foreground font-body shrink-0">Payment ID</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-foreground text-xs truncate">{paymentId}</span>
                  <button
                    onClick={() => copyToClipboard(paymentId, "Payment ID")}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Copy payment ID"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Items */}
            {items?.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Package className="h-4 w-4" /> Items Ordered
                </h3>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-muted-foreground font-body">
                      <span>
                        {item.name} × {item.cartQuantity}
                        {item.selectedSize && ` (${item.selectedSize})`}
                      </span>
                      <span>₹{(item.price * item.cartQuantity).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>

                {/* Price breakdown */}
                <div className="mt-3 space-y-1.5 border-t pt-3">
                  <div className="flex justify-between text-sm text-muted-foreground font-body">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 font-body">
                      <span>Discount {promoCode ? `(${promoCode})` : ""}</span>
                      <span>− ₹{discount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-muted-foreground font-body">
                    <span>Delivery charge</span>
                    <span>{charge === 0 ? <span className="text-green-600">FREE</span> : `₹${charge.toLocaleString("en-IN")}`}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-foreground pt-1 border-t">
                    <span>{isCOD ? "Amount to pay on delivery" : "Amount Paid"}</span>
                    <span>₹{amount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Address */}
            {address && (
              <div className="border-t pt-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MapPin className="h-4 w-4" /> Delivering To
                </h3>
                <div className="text-sm text-muted-foreground font-body space-y-0.5">
                  <p className="font-medium text-foreground">{address.fullName}</p>
                  <p>{address.phone}</p>
                  <p>{address.street}</p>
                  <p>{address.city}, {address.state} - {address.pincode}</p>
                </div>
              </div>
            )}

            {/* COD reminder */}
            {isCOD && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 font-body">
                💵 Please keep <strong>₹{amount.toLocaleString("en-IN")}</strong> ready in cash when your order arrives.
              </div>
            )}

          </CardContent>
        </Card>

        <Link to="/" className="mt-8">
          <Button className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Continue Shopping
          </Button>
        </Link>
      </main>
      <Footer />
    </div>
  );
};

export default OrderConfirmation;
