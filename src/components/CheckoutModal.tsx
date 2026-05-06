import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { X, MapPin, Loader2, CheckCircle2, Plus } from "lucide-react";
import { ShippingAddress } from "@/types/order";
import { sendOrderEmails } from "@/lib/email";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  userEmail: string;
}

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Puducherry",
];

const empty: ShippingAddress = {
  fullName: "", phone: "", street: "", city: "", state: "", pincode: "",
};

const CheckoutModal = ({ open, onClose, userEmail }: CheckoutModalProps) => {
  const { items, totalPrice, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([]);
  const [selectedSavedIdx, setSelectedSavedIdx] = useState<number | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>(empty);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const load = async () => {
      setLoadingSaved(true);
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          const addrs: ShippingAddress[] = data.savedAddresses ?? [];
          const defaultIdx: number = data.defaultAddressIndex ?? 0;
          setSavedAddresses(addrs);
          if (addrs.length > 0) {
            setSelectedSavedIdx(defaultIdx < addrs.length ? defaultIdx : 0);
            setUseNewAddress(false);
          } else {
            setUseNewAddress(true);
          }
        } else {
          setUseNewAddress(true);
        }
      } catch {
        setUseNewAddress(true);
      }
      setLoadingSaved(false);
    };
    load();
  }, [open, user]);

  if (!open) return null;

  const activeAddress: ShippingAddress | null =
    !useNewAddress && selectedSavedIdx !== null
      ? savedAddresses[selectedSavedIdx]
      : address;

  const field = (key: keyof ShippingAddress) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setAddress((prev) => ({ ...prev, [key]: e.target.value }));

  const validate = (addr: ShippingAddress): string | null => {
    if (!addr.fullName.trim()) return "Full name is required";
    if (!/^[6-9]\d{9}$/.test(addr.phone)) return "Enter a valid 10-digit mobile number";
    if (!addr.street.trim()) return "Street address is required";
    if (!addr.city.trim()) return "City is required";
    if (!addr.state) return "Please select a state";
    if (!/^\d{6}$/.test(addr.pincode)) return "Enter a valid 6-digit pincode";
    return null;
  };

  const handlePay = () => {
    if (!activeAddress) { toast({ title: "Please select or enter a delivery address", variant: "destructive" }); return; }
    const err = validate(activeAddress);
    if (err) { toast({ title: err, variant: "destructive" }); return; }

    const addressLine = `${activeAddress.fullName}\n${activeAddress.phone}\n${activeAddress.street}, ${activeAddress.city}, ${activeAddress.state} - ${activeAddress.pincode}`;
    const itemsSummary = items
      .map((i) => `${i.name}${i.selectedSize ? ` (${i.selectedSize})` : ""} × ${i.cartQuantity} = ₹${(i.price * i.cartQuantity).toLocaleString("en-IN")}`)
      .join("\n");

    const options: any = {
      key: "rzp_live_Siq5Fd24TZ9Zxl",
      amount: totalPrice * 100,
      currency: "INR",
      name: "Urban Dhage",
      description: `Order of ${items.length} item(s)`,
      prefill: { name: activeAddress.fullName, email: userEmail, contact: activeAddress.phone },
      notes: { delivery_address: addressLine },
      theme: { color: "#7c3aed" },
      handler: async (response: any) => {
        setPaying(true);
        const now = Date.now();
        try {
          const orderRef = await addDoc(collection(db, "orders"), {
            customerName:  activeAddress.fullName,
            customerEmail: userEmail,
            paymentId:     response.razorpay_payment_id,
            amount:        totalPrice,
            address:       activeAddress,
            items: items.map((i) => ({
              name:         i.name,
              price:        i.price,
              cartQuantity: i.cartQuantity,
              selectedSize: i.selectedSize || null,
              image:        i.image || null,
            })),
            status:        "order_placed",
            createdAt:     now,
            updatedAt:     now,
            statusHistory: [{ status: "order_placed", timestamp: now }],
          });
          await updateDoc(orderRef, { orderId: orderRef.id });
          await sendOrderEmails({
            customerName:  activeAddress.fullName,
            customerEmail: userEmail,
            paymentId:     response.razorpay_payment_id,
            amount:        totalPrice,
            addressLine,
            itemsSummary,
          });
        } catch (err) {
          console.error("Post-payment error:", err);
        }
        clearCart();
        onClose();
        navigate("/order-confirmation", {
          state: {
            paymentId: response.razorpay_payment_id,
            amount:    totalPrice,
            address:   activeAddress,
            items: items.map((i) => ({
              name: i.name, cartQuantity: i.cartQuantity,
              price: i.price, selectedSize: i.selectedSize,
            })),
          },
        });
      },
      modal: { ondismiss: () => toast({ title: "Payment cancelled" }) },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* FIX: full-width sheet on mobile, centered card on sm+ */}
      <div className="w-full sm:max-w-lg bg-card sm:rounded-2xl shadow-xl overflow-hidden rounded-t-2xl">

        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-base font-semibold">Delivery Address</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* FIX: max-h accounts for bottom sheet on mobile (leaves room for CTA) */}
        <div className="px-4 py-5 space-y-4 max-h-[60vh] overflow-y-auto sm:px-6 sm:max-h-[65vh]">

          {/* Saved addresses */}
          {loadingSaved && (
            <div className="space-y-2">
              <div className="h-16 animate-pulse rounded-xl bg-muted" />
              <div className="h-16 animate-pulse rounded-xl bg-muted" />
            </div>
          )}

          {!loadingSaved && savedAddresses.length > 0 && (
            <div className="space-y-2">
              <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Saved Addresses
              </p>

              {savedAddresses.map((addr, idx) => (
                <label
                  key={idx}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                    !useNewAddress && selectedSavedIdx === idx
                      ? "border-primary/40 bg-primary/[0.03]"
                      : "border-border hover:border-border/80 hover:bg-muted/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="address-select"
                    className="mt-0.5 accent-primary"
                    checked={!useNewAddress && selectedSavedIdx === idx}
                    onChange={() => { setSelectedSavedIdx(idx); setUseNewAddress(false); }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-body text-sm font-semibold text-foreground">{addr.fullName}</p>
                      {idx === 0 && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-body text-[10px] font-semibold text-primary">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="font-body text-xs text-muted-foreground">{addr.phone}</p>
                    <p className="mt-0.5 font-body text-xs leading-relaxed text-muted-foreground">
                      {addr.street}, {addr.city}, {addr.state} — {addr.pincode}
                    </p>
                  </div>
                  {!useNewAddress && selectedSavedIdx === idx && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </label>
              ))}

              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                  useNewAddress
                    ? "border-primary/40 bg-primary/[0.03]"
                    : "border-border hover:border-border/80 hover:bg-muted/20"
                }`}
              >
                <input
                  type="radio"
                  name="address-select"
                  className="accent-primary"
                  checked={useNewAddress}
                  onChange={() => setUseNewAddress(true)}
                />
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-body text-sm font-medium text-foreground">Use a different address</span>
              </label>
            </div>
          )}

          {/* New address form */}
          {(useNewAddress || savedAddresses.length === 0) && !loadingSaved && (
            <div className="space-y-3">
              {savedAddresses.length > 0 && (
                <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  New Address
                </p>
              )}

              <div className="space-y-1">
                <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name *</label>
                <Input placeholder="Priya Sharma" value={address.fullName} onChange={field("fullName")} />
              </div>

              <div className="space-y-1">
                <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mobile Number *</label>
                <Input placeholder="9876543210" maxLength={10} value={address.phone} onChange={field("phone")} inputMode="numeric" />
              </div>

              <div className="space-y-1">
                <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Street Address *</label>
                <Input placeholder="House no., Street, Area, Landmark" value={address.street} onChange={field("street")} />
              </div>

              {/* FIX: stacked on mobile, side-by-side on sm+ */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">City *</label>
                  <Input placeholder="Lucknow" value={address.city} onChange={field("city")} />
                </div>
                <div className="space-y-1">
                  <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pincode *</label>
                  <Input placeholder="226001" maxLength={6} value={address.pincode} onChange={field("pincode")} inputMode="numeric" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">State *</label>
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
          )}

          {/* Order summary */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order Summary</p>
            {items.map((item) => (
              <div key={`${item.id}-${item.selectedSize}`} className="flex justify-between gap-2 text-sm">
                <span className="text-foreground truncate min-w-0">
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
            <p className="font-body text-xs text-primary">✦ Free shipping on this order</p>
          </div>
        </div>

        <div className="px-4 py-4 border-t border-border sm:px-6">
          <Button className="w-full rounded-full text-base py-5 gap-2" onClick={handlePay} disabled={paying}>
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
