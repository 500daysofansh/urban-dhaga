import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { X, MapPin, Loader2, CheckCircle2, Plus, Truck, CreditCard, Tag, ChevronRight } from "lucide-react";
import { ShippingAddress } from "@/types/order";
import { sendOrderEmails } from "@/lib/email";
import { db } from "@/lib/firebase";
import {
  collection, addDoc, updateDoc, doc, getDoc,
  query, where, getDocs, arrayUnion,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

const DELIVERY_CHARGE = 60;

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Promo types ───────────────────────────────────────────────────────────────
interface AppliedPromo {
  docId: string;
  code: string;
  discountType: "percent" | "free_delivery";
  discountValue: number; // percent value OR 0 for free_delivery
}

const CheckoutModal = ({ open, onClose }: CheckoutModalProps) => {
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
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");

  // ── Promo state ───────────────────────────────────────────────────────────
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState("");

  const authEmail = user?.email ?? "";
  const needsEmailInput = !authEmail || !EMAIL_RE.test(authEmail);
  const [emailOverride, setEmailOverride] = useState("");
  const resolvedEmail = needsEmailInput ? emailOverride.trim() : authEmail;
  const emailValid = EMAIL_RE.test(resolvedEmail);

  // ── Compute final amount with promo ──────────────────────────────────────
  const deliveryCharge = appliedPromo?.discountType === "free_delivery" ? 0 : DELIVERY_CHARGE;
  const subtotalDiscount =
    appliedPromo?.discountType === "percent"
      ? Math.round((totalPrice * appliedPromo.discountValue) / 100)
      : 0;
  const finalAmount = totalPrice - subtotalDiscount + deliveryCharge;

  // Reset promo when modal closes
  useEffect(() => {
    if (!open) {
      setAppliedPromo(null);
      setPromoInput("");
      setPromoError("");
    }
  }, [open]);

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

  // ── Apply promo code ──────────────────────────────────────────────────────
  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (!user) {
      setPromoError("Please log in to apply a promo code.");
      return;
    }

    setPromoLoading(true);
    setPromoError("");
    setAppliedPromo(null);

    try {
      const q = query(
        collection(db, "promoCodes"),
        where("code", "==", code),
        where("isActive", "==", true)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setPromoError("Invalid or expired promo code.");
        setPromoLoading(false);
        return;
      }

      const promoDoc = snap.docs[0];
      const data = promoDoc.data();
      const usedBy: string[] = data.usedBy ?? [];

      if (usedBy.includes(user.uid)) {
        setPromoError("You've already used this promo code.");
        setPromoLoading(false);
        return;
      }

      setAppliedPromo({
        docId: promoDoc.id,
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue ?? 0,
      });
      toast({
        title: "Promo applied! 🎉",
        description:
          data.discountType === "free_delivery"
            ? "Free delivery applied."
            : `${data.discountValue}% off your order.`,
      });
    } catch {
      setPromoError("Something went wrong. Please try again.");
    }
    setPromoLoading(false);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
  };

  // ── Mark promo as used for this user ─────────────────────────────────────
  const markPromoUsed = async () => {
    if (!appliedPromo || !user) return;
    try {
      await updateDoc(doc(db, "promoCodes", appliedPromo.docId), {
        usedBy: arrayUnion(user.uid),
      });
    } catch (err) {
      console.error("Failed to mark promo used:", err);
    }
  };

  // ── Place order (shared logic) ────────────────────────────────────────────
  const buildOrderPayload = (paymentId: string) => ({
    customerName: activeAddress!.fullName,
    customerEmail: resolvedEmail,
    paymentId,
    amount: finalAmount,
    deliveryCharge,
    subtotalDiscount,
    promoCode: appliedPromo?.code ?? null,
    paymentMethod: paymentMethod === "cod" ? "cod" : "online",
    address: activeAddress,
    items: items.map((i) => ({
      name: i.name,
      price: i.price,
      cartQuantity: i.cartQuantity,
      selectedSize: i.selectedSize || null,
      image: i.image || null,
    })),
    status: "order_placed",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    statusHistory: [{ status: "order_placed", timestamp: Date.now() }],
  });

  const handlePay = async () => {
    if (!emailValid) {
      toast({ title: "Please enter a valid email address for order confirmation", variant: "destructive" });
      return;
    }
    if (!activeAddress) {
      toast({ title: "Please select or enter a delivery address", variant: "destructive" });
      return;
    }
    const err = validate(activeAddress);
    if (err) {
      toast({ title: err, variant: "destructive" });
      return;
    }

    const addressLine = `${activeAddress.fullName}\n${activeAddress.phone}\n${activeAddress.street}, ${activeAddress.city}, ${activeAddress.state} - ${activeAddress.pincode}`;
    const itemsSummary = items
      .map((i) => `${i.name}${i.selectedSize ? ` (${i.selectedSize})` : ""} × ${i.cartQuantity} = ₹${(i.price * i.cartQuantity).toLocaleString("en-IN")}`)
      .join("\n");

    // ── COD ───────────────────────────────────────────────────────────────
    if (paymentMethod === "cod") {
      setPaying(true);
      try {
        const payload = buildOrderPayload("COD");
        const orderRef = await addDoc(collection(db, "orders"), payload);
        await updateDoc(orderRef, { orderId: orderRef.id });
        await markPromoUsed();
        await sendOrderEmails({
          customerName: activeAddress.fullName,
          customerEmail: resolvedEmail,
          paymentId: "COD",
          amount: finalAmount,
          addressLine,
          itemsSummary,
        });
      } catch (e) {
        console.error("COD order error:", e);
        toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
        setPaying(false);
        return;
      }
      clearCart();
      onClose();
      navigate("/order-confirmation", {
        state: {
          paymentId: "COD",
          amount: finalAmount,
          deliveryCharge,
          subtotalDiscount,
          promoCode: appliedPromo?.code ?? null,
          paymentMethod: "cod",
          address: activeAddress,
          items: items.map((i) => ({
            name: i.name, cartQuantity: i.cartQuantity,
            price: i.price, selectedSize: i.selectedSize,
          })),
        },
      });
      return;
    }

    // ── Razorpay ──────────────────────────────────────────────────────────
    const options: any = {
      key: "rzp_live_Siq5Fd24TZ9Zxl",
      amount: finalAmount * 100,
      currency: "INR",
      name: "Urban Dhage",
      description: `Order of ${items.length} item(s)`,
      prefill: { name: activeAddress.fullName, email: resolvedEmail, contact: activeAddress.phone },
      notes: { delivery_address: addressLine },
      theme: { color: "#7c3aed" },
      handler: async (response: any) => {
        setPaying(true);
        try {
          const payload = buildOrderPayload(response.razorpay_payment_id);
          const orderRef = await addDoc(collection(db, "orders"), payload);
          await updateDoc(orderRef, { orderId: orderRef.id });
          await markPromoUsed();
          await sendOrderEmails({
            customerName: activeAddress.fullName,
            customerEmail: resolvedEmail,
            paymentId: response.razorpay_payment_id,
            amount: finalAmount,
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
            amount: finalAmount,
            deliveryCharge,
            subtotalDiscount,
            promoCode: appliedPromo?.code ?? null,
            paymentMethod: "online",
            address: activeAddress,
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
      <div className="w-full sm:max-w-lg bg-card sm:rounded-2xl shadow-xl overflow-hidden rounded-t-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-base font-semibold">Checkout</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-4 py-5 space-y-5 max-h-[60vh] overflow-y-auto sm:px-6 sm:max-h-[65vh]">

          {/* Email override for phone-auth users */}
          {needsEmailInput && !loadingSaved && (
            <div className="space-y-2">
              <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Contact</p>
              <div className="space-y-1">
                <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Email Address *{" "}
                  <span className="normal-case font-normal text-muted-foreground/70">(for order confirmation)</span>
                </label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={emailOverride}
                  onChange={(e) => setEmailOverride(e.target.value)}
                  inputMode="email"
                  autoComplete="email"
                  className={emailOverride && !emailValid ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {emailOverride && !emailValid && (
                  <p className="font-body text-xs text-destructive">Please enter a valid email address</p>
                )}
              </div>
            </div>
          )}

          {/* Saved addresses */}
          {loadingSaved && (
            <div className="space-y-2">
              <div className="h-16 animate-pulse rounded-xl bg-muted" />
              <div className="h-16 animate-pulse rounded-xl bg-muted" />
            </div>
          )}

          {!loadingSaved && savedAddresses.length > 0 && (
            <div className="space-y-2">
              <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Saved Addresses</p>
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
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-body text-[10px] font-semibold text-primary">Default</span>
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
                <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">New Address</p>
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

          {/* Payment Method */}
          <div className="space-y-2">
            <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Payment Method</p>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3.5 transition-colors ${
                paymentMethod === "online" ? "border-primary/40 bg-primary/[0.03]" : "border-border hover:border-border/80 hover:bg-muted/20"
              }`}>
                <input type="radio" name="payment-method" className="accent-primary" checked={paymentMethod === "online"} onChange={() => setPaymentMethod("online")} />
                <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-body text-sm font-semibold text-foreground">Pay Online</p>
                  <p className="font-body text-[10px] text-muted-foreground">UPI / Card / Net banking</p>
                </div>
              </label>
              <label className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3.5 transition-colors ${
                paymentMethod === "cod" ? "border-primary/40 bg-primary/[0.03]" : "border-border hover:border-border/80 hover:bg-muted/20"
              }`}>
                <input type="radio" name="payment-method" className="accent-primary" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-body text-sm font-semibold text-foreground">Cash on Delivery</p>
                  <p className="font-body text-[10px] text-muted-foreground">Pay when delivered</p>
                </div>
              </label>
            </div>
          </div>

          {/* ── Promo Code ── */}
          <div className="space-y-2">
            <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Promo Code</p>

            {appliedPromo ? (
              /* Applied state */
              <div className="flex items-center justify-between rounded-xl border border-green-300 bg-green-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <div>
                    <p className="font-body text-sm font-semibold text-green-800">{appliedPromo.code}</p>
                    <p className="font-body text-xs text-green-600">
                      {appliedPromo.discountType === "free_delivery"
                        ? "Free delivery applied"
                        : `${appliedPromo.discountValue}% off applied — saving ₹${subtotalDiscount.toLocaleString("en-IN")}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemovePromo}
                  className="text-green-600 hover:text-green-800 transition-colors"
                  aria-label="Remove promo code"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* Input state */
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Enter promo code"
                      value={promoInput}
                      onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                      className="pl-9 font-mono text-sm uppercase tracking-widest"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    className="shrink-0 gap-1"
                  >
                    {promoLoading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><span>Apply</span><ChevronRight className="h-3.5 w-3.5" /></>
                    }
                  </Button>
                </div>
                {promoError && (
                  <p className="font-body text-xs text-destructive">{promoError}</p>
                )}
              </div>
            )}
          </div>

          {/* Order Summary */}
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
            <div className="flex justify-between text-sm text-muted-foreground pt-1">
              <span>Subtotal</span>
              <span>₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
            {subtotalDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount ({appliedPromo?.discountValue}% off)</span>
                <span>− ₹{subtotalDiscount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Delivery charge</span>
              <span className={deliveryCharge === 0 ? "text-green-600 line-through decoration-green-600" : ""}>
                {deliveryCharge === 0
                  ? `₹${DELIVERY_CHARGE} FREE`
                  : `₹${DELIVERY_CHARGE.toLocaleString("en-IN")}`}
              </span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-semibold text-sm">
              <span>Total</span>
              <span>₹{finalAmount.toLocaleString("en-IN")}</span>
            </div>
            {paymentMethod === "cod" && (
              <p className="font-body text-xs text-amber-600">✦ Pay ₹{finalAmount.toLocaleString("en-IN")} in cash at delivery</p>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 py-4 border-t border-border sm:px-6">
          <Button
            className="w-full rounded-full text-base py-5 gap-2"
            onClick={handlePay}
            disabled={paying || !emailValid}
            title={!emailValid ? "Enter your email address above to continue" : undefined}
          >
            {paying ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
            ) : paymentMethod === "cod" ? (
              `Place Order (COD) · ₹${finalAmount.toLocaleString("en-IN")} →`
            ) : (
              `Pay ₹${finalAmount.toLocaleString("en-IN")} →`
            )}
          </Button>
          {needsEmailInput && !emailValid && (
            <p className="mt-2 text-center font-body text-xs text-muted-foreground">
              Enter your email above to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
