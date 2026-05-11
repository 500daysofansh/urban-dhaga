import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  X, MapPin, Loader2, CheckCircle2, Plus,
  Truck, CreditCard, Tag, ChevronRight,
} from "lucide-react";
import { ShippingAddress } from "@/types/order";
import { sendOrderEmails } from "@/lib/email";
import { db } from "@/lib/firebase";
import {
  collection, addDoc, updateDoc, doc,
  getDoc, query, where, getDocs, arrayUnion,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const DELIVERY_CHARGE = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Puducherry",
];

const EMPTY_ADDRESS: ShippingAddress = {
  fullName: "", phone: "", street: "", city: "", state: "", pincode: "",
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface AppliedPromo {
  docId: string;
  code: string;
  discountType: "percent" | "free_delivery";
  discountValue: number;
}

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function validateAddress(addr: ShippingAddress): string | null {
  if (!addr.fullName.trim())              return "Full name is required";
  if (!/^[6-9]\d{9}$/.test(addr.phone))  return "Enter a valid 10-digit mobile number";
  if (!addr.street.trim())               return "Street address is required";
  if (!addr.city.trim())                 return "City is required";
  if (!addr.state)                       return "Please select a state";
  if (!/^\d{6}$/.test(addr.pincode))     return "Enter a valid 6-digit pincode";
  return null;
}

// Loads Razorpay script on demand, resolves when ready.
// Safe to call multiple times — reuses existing script tag.
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
const CheckoutModal = ({ open, onClose }: CheckoutModalProps) => {
  const { items, totalPrice, clearCart } = useCart();
  const { toast } = useToast();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  // Address
  const [savedAddresses, setSavedAddresses]     = useState<ShippingAddress[]>([]);
  const [selectedSavedIdx, setSelectedSavedIdx] = useState<number | null>(null);
  const [useNewAddress, setUseNewAddress]       = useState(false);
  const [newAddress, setNewAddress]             = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [loadingSaved, setLoadingSaved]         = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");
  const [paying, setPaying]               = useState(false);

  // Promo
  const [promoInput, setPromoInput]     = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError]     = useState("");

  // Email (phone-auth users)
  const authEmail   = user?.email ?? "";
  const needsEmail  = !authEmail || !EMAIL_RE.test(authEmail);
  const [emailOverride, setEmailOverride] = useState("");
  const resolvedEmail = needsEmail ? emailOverride.trim() : authEmail;
  const emailValid    = EMAIL_RE.test(resolvedEmail);

  // ── Derived totals ──────────────────────────────────────────────────────
  const deliveryCharge   = appliedPromo?.discountType === "free_delivery" ? 0 : DELIVERY_CHARGE;
  const subtotalDiscount = appliedPromo?.discountType === "percent"
    ? Math.round((totalPrice * appliedPromo.discountValue) / 100)
    : 0;
  const finalAmount = totalPrice - subtotalDiscount + deliveryCharge;

  // ── Active address ──────────────────────────────────────────────────────
  const activeAddress: ShippingAddress | null =
    !useNewAddress && selectedSavedIdx !== null
      ? savedAddresses[selectedSavedIdx]
      : newAddress;

  // ── Reset on close ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setAppliedPromo(null);
      setPromoInput("");
      setPromoError("");
      setPaying(false);
    }
  }, [open]);

  // ── Preload Razorpay when modal opens & online payment is selected ──────
  useEffect(() => {
    if (open && paymentMethod === "online") {
      loadRazorpayScript().catch(() => {});
    }
  }, [open, paymentMethod]);

  // ── Load saved addresses ────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !user) return;
    setLoadingSaved(true);
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const data    = snap.data();
          const addrs: ShippingAddress[] = data.savedAddresses ?? [];
          const defIdx: number           = data.defaultAddressIndex ?? 0;
          setSavedAddresses(addrs);
          if (addrs.length > 0) {
            setSelectedSavedIdx(defIdx < addrs.length ? defIdx : 0);
            setUseNewAddress(false);
          } else {
            setUseNewAddress(true);
          }
        } else {
          setUseNewAddress(true);
        }
      })
      .catch(() => setUseNewAddress(true))
      .finally(() => setLoadingSaved(false));
  }, [open, user]);

  if (!open) return null;

  // ── Field helper ────────────────────────────────────────────────────────
  const field = (key: keyof ShippingAddress) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setNewAddress((prev) => ({ ...prev, [key]: e.target.value }));

  // ── Apply promo ─────────────────────────────────────────────────────────
  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (!user) { setPromoError("Please log in to apply a promo code."); return; }

    setPromoLoading(true);
    setPromoError("");
    setAppliedPromo(null);

    try {
      const snap = await getDocs(
        query(collection(db, "promoCodes"),
          where("code", "==", code),
          where("isActive", "==", true))
      );

      if (snap.empty) {
        setPromoError("Invalid or expired promo code.");
        setPromoLoading(false);
        return;
      }

      const promoDoc = snap.docs[0];
      const data     = promoDoc.data();
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
        description: data.discountType === "free_delivery"
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

  // ── Mark promo used ─────────────────────────────────────────────────────
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

  // ── Build Firestore payload ─────────────────────────────────────────────
  const buildPayload = (paymentId: string) => ({
    customerName:    activeAddress!.fullName,
    customerEmail:   resolvedEmail,
    paymentId,
    amount:          finalAmount,
    deliveryCharge,
    subtotalDiscount,
    promoCode:       appliedPromo?.code ?? null,
    paymentMethod:   paymentMethod === "cod" ? "cod" : "online",
    address:         activeAddress,
    items: items.map((i) => ({
      name:         i.name,
      price:        i.price,
      cartQuantity: i.cartQuantity,
      selectedSize: i.selectedSize || null,
      image:        i.image || null,
    })),
    status:        "order_placed",
    createdAt:     Date.now(),
    updatedAt:     Date.now(),
    statusHistory: [{ status: "order_placed", timestamp: Date.now() }],
  });

  // ── Save order → return orderId ─────────────────────────────────────────
  const saveOrder = async (paymentId: string): Promise<string> => {
    const orderRef = await addDoc(collection(db, "orders"), buildPayload(paymentId));
    await updateDoc(orderRef, { orderId: orderRef.id });
    return orderRef.id;
  };

  // ── Navigate to confirmation ────────────────────────────────────────────
  const goToConfirmation = (orderId: string, paymentId: string) => {
    clearCart();
    onClose();
    navigate("/order-confirmation", {
      state: {
        orderId,
        paymentId,
        amount:          finalAmount,
        deliveryCharge,
        subtotalDiscount,
        promoCode:       appliedPromo?.code ?? null,
        paymentMethod,
        address:         activeAddress,
        items: items.map((i) => ({
          name: i.name, cartQuantity: i.cartQuantity,
          price: i.price, selectedSize: i.selectedSize,
        })),
      },
    });
  };

  // ── Main pay handler ────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!emailValid) {
      toast({ title: "Enter a valid email for order confirmation", variant: "destructive" });
      return;
    }
    if (!activeAddress) {
      toast({ title: "Please select or enter a delivery address", variant: "destructive" });
      return;
    }
    const err = validateAddress(activeAddress);
    if (err) { toast({ title: err, variant: "destructive" }); return; }

    const addressLine  = `${activeAddress.fullName}\n${activeAddress.phone}\n${activeAddress.street}, ${activeAddress.city}, ${activeAddress.state} - ${activeAddress.pincode}`;
    const itemsSummary = items
      .map((i) => `${i.name}${i.selectedSize ? ` (${i.selectedSize})` : ""} × ${i.cartQuantity} = ₹${(i.price * i.cartQuantity).toLocaleString("en-IN")}`)
      .join("\n");

    // COD
    if (paymentMethod === "cod") {
      setPaying(true);
      try {
        const orderId = await saveOrder("COD");
        await markPromoUsed();
        await sendOrderEmails({ customerName: activeAddress.fullName, customerEmail: resolvedEmail, paymentId: "COD", amount: finalAmount, addressLine, itemsSummary });
        goToConfirmation(orderId, "COD");
      } catch (e) {
        console.error("COD order error:", e);
        toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
        setPaying(false);
      }
      return;
    }

    // Razorpay — ensure script is loaded before opening
    try {
      await loadRazorpayScript();
    } catch {
      toast({ title: "Failed to load payment gateway. Please try again.", variant: "destructive" });
      return;
    }

    const rzp = new (window as any).Razorpay({
      key:         "rzp_live_Siq5Fd24TZ9Zxl",
      amount:      finalAmount * 100,
      currency:    "INR",
      name:        "Urban Dhage",
      description: `Order of ${items.length} item(s)`,
      prefill:     { name: activeAddress.fullName, email: resolvedEmail, contact: activeAddress.phone },
      notes:       { delivery_address: addressLine },
      theme:       { color: "#7c3aed" },
      handler: async (response: any) => {
        setPaying(true);
        try {
          const orderId = await saveOrder(response.razorpay_payment_id);
          await markPromoUsed();
          await sendOrderEmails({ customerName: activeAddress.fullName, customerEmail: resolvedEmail, paymentId: response.razorpay_payment_id, amount: finalAmount, addressLine, itemsSummary });
          goToConfirmation(orderId, response.razorpay_payment_id);
        } catch (err) {
          console.error("Post-payment error:", err);
        }
      },
      modal: { ondismiss: () => toast({ title: "Payment cancelled" }) },
    });
    rzp.open();
  };

  // ─────────────────────────────────────────────
  // Render — unchanged
  // ─────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-lg bg-card sm:rounded-2xl shadow-xl overflow-hidden rounded-t-2xl flex flex-col max-h-[95dvh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-base font-semibold">Checkout</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close checkout"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 sm:px-6">

          {needsEmail && !loadingSaved && (
            <section className="space-y-2">
              <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Contact</p>
              <div className="space-y-1">
                <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Email Address *
                  <span className="ml-1 normal-case font-normal text-muted-foreground/70">(for order confirmation)</span>
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
            </section>
          )}

          <section className="space-y-2">
            <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Delivery Address
            </p>

            {loadingSaved && (
              <div className="space-y-2">
                <div className="h-16 animate-pulse rounded-xl bg-muted" />
                <div className="h-16 animate-pulse rounded-xl bg-muted" />
              </div>
            )}

            {!loadingSaved && savedAddresses.length > 0 && (
              <div className="space-y-2">
                {savedAddresses.map((addr, idx) => (
                  <label
                    key={idx}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                      !useNewAddress && selectedSavedIdx === idx
                        ? "border-primary/40 bg-primary/[0.03]"
                        : "border-border hover:bg-muted/20"
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

                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                  useNewAddress ? "border-primary/40 bg-primary/[0.03]" : "border-border hover:bg-muted/20"
                }`}>
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

            {!loadingSaved && (useNewAddress || savedAddresses.length === 0) && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name *</label>
                  <Input placeholder="Priya Sharma" value={newAddress.fullName} onChange={field("fullName")} />
                </div>
                <div className="space-y-1">
                  <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mobile Number *</label>
                  <Input placeholder="9876543210" maxLength={10} inputMode="numeric" value={newAddress.phone} onChange={field("phone")} />
                </div>
                <div className="space-y-1">
                  <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Street Address *</label>
                  <Input placeholder="House no., Street, Area, Landmark" value={newAddress.street} onChange={field("street")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">City *</label>
                    <Input placeholder="Lucknow" value={newAddress.city} onChange={field("city")} />
                  </div>
                  <div className="space-y-1">
                    <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pincode *</label>
                    <Input placeholder="226001" maxLength={6} inputMode="numeric" value={newAddress.pincode} onChange={field("pincode")} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">State *</label>
                  <select
                    value={newAddress.state}
                    onChange={field("state")}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Payment Method</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "online" as const, icon: <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />, label: "Pay Online",        sub: "UPI / Card / Net banking" },
                { value: "cod"    as const, icon: <Truck       className="h-4 w-4 text-muted-foreground shrink-0" />, label: "Cash on Delivery", sub: "Pay when delivered" },
              ].map(({ value, icon, label, sub }) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3.5 transition-colors ${
                    paymentMethod === value ? "border-primary/40 bg-primary/[0.03]" : "border-border hover:bg-muted/20"
                  }`}
                >
                  <input type="radio" name="payment-method" className="accent-primary" checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} />
                  {icon}
                  <div>
                    <p className="font-body text-sm font-semibold text-foreground">{label}</p>
                    <p className="font-body text-[10px] text-muted-foreground">{sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Promo Code</p>

            {appliedPromo ? (
              <div className="flex items-center justify-between rounded-xl border border-green-300 bg-green-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  <div>
                    <p className="font-body text-sm font-semibold text-green-800">{appliedPromo.code}</p>
                    <p className="font-body text-xs text-green-600">
                      {appliedPromo.discountType === "free_delivery"
                        ? "Free delivery applied"
                        : `${appliedPromo.discountValue}% off — saving ₹${subtotalDiscount.toLocaleString("en-IN")}`}
                    </p>
                  </div>
                </div>
                <button onClick={handleRemovePromo} aria-label="Remove promo code" className="rounded-lg p-1.5 text-green-600 hover:bg-green-100 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
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
                  <Button type="button" variant="outline" onClick={handleApplyPromo} disabled={promoLoading || !promoInput.trim()} className="shrink-0 gap-1">
                    {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Apply</span><ChevronRight className="h-3.5 w-3.5" /></>}
                  </Button>
                </div>
                {promoError && <p className="font-body text-xs text-destructive">{promoError}</p>}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order Summary</p>

            {items.map((item) => (
              <div key={`${item.id}-${item.selectedSize}`} className="flex justify-between gap-2 text-sm">
                <span className="text-foreground truncate min-w-0">
                  {item.name}{item.selectedSize ? ` (${item.selectedSize})` : ""} × {item.cartQuantity}
                </span>
                <span className="text-muted-foreground shrink-0">₹{(item.price * item.cartQuantity).toLocaleString("en-IN")}</span>
              </div>
            ))}

            <div className="border-t border-border/60 pt-2 space-y-1.5">
              <div className="flex justify-between text-sm text-muted-foreground">
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
                <span>Delivery</span>
                {deliveryCharge === 0
                  ? <span className="text-green-600 font-medium">FREE 🎉</span>
                  : <span>₹{DELIVERY_CHARGE}</span>}
              </div>
              <div className="flex justify-between text-sm font-semibold text-foreground border-t border-border/60 pt-2">
                <span>Total</span>
                <span>₹{finalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {paymentMethod === "cod" && (
              <p className="font-body text-xs text-amber-600 pt-1">
                ✦ Pay ₹{finalAmount.toLocaleString("en-IN")} in cash at delivery
              </p>
            )}
          </section>

        </div>

        {/* CTA */}
        <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
          <Button
            className="w-full rounded-full text-base py-5 gap-2"
            onClick={handlePay}
            disabled={paying || !emailValid}
          >
            {paying ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
            ) : paymentMethod === "cod" ? (
              `Place Order (COD) · ₹${finalAmount.toLocaleString("en-IN")} →`
            ) : (
              `Pay ₹${finalAmount.toLocaleString("en-IN")} →`
            )}
          </Button>
          {needsEmail && !emailValid && (
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
