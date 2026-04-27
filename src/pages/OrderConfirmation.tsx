import { Link, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowLeft, Package, MapPin } from "lucide-react";
import { ShippingAddress } from "@/types/order";

const OrderConfirmation = () => {
  const location = useLocation();
  const { paymentId, amount, items, address } = (location.state as {
    paymentId: string;
    amount: number;
    address: ShippingAddress;
    items: { name: string; cartQuantity: number; price: number; selectedSize?: string }[];
  }) || { paymentId: "", amount: 0, items: [], address: null };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 py-12 sm:px-6">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <CheckCircle className="h-16 w-16 text-primary" />
          <h1 className="text-2xl font-bold text-foreground font-heading">Order Confirmed!</h1>
          <p className="text-muted-foreground font-body">
            Thank you for your purchase. Your payment was successful.
          </p>
        </div>

        <Card className="w-full">
          <CardContent className="space-y-4 p-6">

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-body">Payment ID</span>
              <span className="font-mono text-foreground text-xs">{paymentId}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-body">Amount Paid</span>
              <span className="font-semibold text-foreground">₹{amount.toLocaleString("en-IN")}</span>
            </div>

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
              </div>
            )}

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