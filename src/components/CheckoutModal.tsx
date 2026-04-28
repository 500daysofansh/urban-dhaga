import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { X, MapPin, Loader2 } from "lucide-react";
import { ShippingAddress } from "@/types/order";
import { sendOrderEmails } from "@/lib/email";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  userEmail: string;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry",
];

const empty: ShippingAddress = {
  fullName: "", phone: "", street: "", city: "", state: "", pincode: "",
};

const CheckoutModal = ({ open, onClose, userEmail }: CheckoutModalProps) => {
  const { items, totalPrice, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [address, setAddress] = useState<ShippingAddress>(empty);
  const [paying, setPaying] = useState(false);

  if (!open) return null;

  const field = (key: keyof ShippingAddress) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setAddress((prev) => ({ ...prev, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!address.fullName.trim()) return "Full name is required";
    if (!/^[6-9]\d{9}$/.test(address.phone)) return "Enter a valid 10-digit mobile number";
    if (!address.street.trim()) return "Street address is required";
    if (!address.city.trim()) return "City is required";
    if (!address.state) return "Please select a state";
    if (!/^\d{6}$/.test(address.pincode)) return "Enter a valid 6-digit pincode";
    return null;
  };

  const handlePay = () => {
    const err = validate();
    if (err) { toast({ title: err, variant: "destructive" }); return; }

    const addressLine = `${address.fullName}\n${address.phone}\n${address.street}, ${address.city}, ${address.state} - ${address.pincode}`;
    const itemsSummary = items
      .map((i) => `${i.name}${i.selectedSize ? ` (${i.selectedSize})` : ""} × ${i.cartQuantity} = ₹${(i.price * i.cartQuantity).toLocaleString("en-IN")}`)
      .join("\n");

    const options: any = {
      key: "rzp_live_Siq5Fd24TZ9Zxl",
      amount: totalPrice * 100,
      currency: "INR",
      name: "Urban Dhage",
      description: `Order of ${items.length} item(s)`,
      prefill: {
        name: address.fullName,
        email: userEmail,
        contact: address.phone,
      },
      notes: {
        delivery_address: addressLine,
      },
      theme: { color: "#7c3aed" },
      handler: async (response: any) => {
        setPaying(true);
        try {
          await sendOrderEmails({
            customerName:  address.fullName,
            customerEmail: userEmail,
            paymentId:     response.razorpay_payment_id,
            amount:        totalPrice,
            addressLine,
            itemsSummary,
          });
        } catch (err) {
          console.error("Email send failed:", err);
          // Don't block order confirmation if email fails
        }
        clearCart();
        onClose();
        navigate("/order-confirmation", {
          state: {
            paymentId: response.razorpay_payment_id,
            amount: totalPrice,
            address,
            items: items.map((i) => ({
              name: i.name,
              cartQuantity: i.cartQuantity,
              price: i.price,
              selectedSize: i.selectedSize,
            })),
          },
        });
      },
      modal: {
        ondismiss: () => toast({ title: "Payment cancelled" }),
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-card rounded-2xl shadow-xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-base font-semibold">Delivery Address</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name *</label>
              <Input placeholder="Priya Sharma" value={address.fullName} onChange={field("fullName")} />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mobile Number *</label>
              <Input placeholder="9876543210" maxLength={10} value={address.phone} onChange={field("phone")} />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Street Address *</label>
              <Input placeholder="House no., Street, Area, Landmark" value={address.street} onChange={field("street")} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">City *</label>
              <Input placeholder="Lucknow" value={address.city} onChange={field("city")} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pincode *</label>
              <Input placeholder="226001" maxLength={6} value={address.pincode} onChange={field("pincode")} />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">State *</label>
              <select
                value={address.state}
                onChange={field("state")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 mt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order Summary</p>
            {items.map((item) => (
              <div key={`${item.id}-${item.selectedSize}`} className="flex justify-between text-sm">
                <span className="text-foreground truncate mr-2">
                  {item.name}{item.selectedSize ? ` (${item.selectedSize})` : ""} × {item.cartQuantity}
                </span>
                <span className="text-muted-foreground shrink-0">
                  ₹{(item.price * item.cartQuantity).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between font-semibold text-sm">
              <span>Total</span>
              <span>₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
            <p className="text-xs text-primary">✦ Free shipping on this order</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border">
          <Button
            className="w-full rounded-full text-base py-5 gap-2"
            onClick={handlePay}
            disabled={paying}
          >
            {paying
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              : `Pay ₹${totalPrice.toLocaleString("en-IN")} →`
            }
          </Button>
        </div>

      </div>
    </div>
  );
};

export default CheckoutModal;
