import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Order, OrderStatus, OrderItem } from "@/types/order";
import { STATUS_META } from "@/lib/email";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShoppingBag, ChevronDown, ChevronUp, MapPin, CreditCard, Package, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconOrderPlaced = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
    <path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);
const IconProcessing = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);
const IconShipped = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/>
  </svg>
);
const IconOutForDelivery = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="1" y="3" width="15" height="13" rx="1"/>
    <path d="M16 8h4l3 5v3h-7V8Z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const IconDelivered = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const IconConfirmed = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconCancelled = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/>
    <path d="m15 9-6 6M9 9l6 6"/>
  </svg>
);

type IconProps = { className?: string };
const STATUS_ICON: Record<OrderStatus, React.FC<IconProps>> = {
  order_placed:     IconOrderPlaced,
  order_processed:  IconProcessing,
  meesho_ordered:   IconConfirmed,
  order_shipped:    IconShipped,
  out_for_delivery: IconOutForDelivery,
  order_delivered:  IconDelivered,
  order_cancelled:  IconCancelled,
};

// ─── Config ───────────────────────────────────────────────────────────────────

const STEPS: OrderStatus[] = [
  "order_placed",
  "order_processed",
  "order_shipped",
  "out_for_delivery",
  "order_delivered",
];

const STEP_LABELS: Record<OrderStatus, string> = {
  order_placed:     "Order Placed",
  order_processed:  "Processing",
  meesho_ordered:   "Confirmed",
  order_shipped:    "Shipped",
  out_for_delivery: "Out for Delivery",
  order_delivered:  "Delivered",
  order_cancelled:  "Cancelled",
};

const STEP_SUB: Record<OrderStatus, string> = {
  order_placed:     "Payment received",
  order_processed:  "Being prepared",
  meesho_ordered:   "Supplier confirmed",
  order_shipped:    "With courier",
  out_for_delivery: "Almost there",
  order_delivered:  "Enjoy your purchase!",
  order_cancelled:  "Order cancelled",
};

function getStepIndex(status: OrderStatus): number {
  const mapped = status === "meesho_ordered" ? "order_processed" : status;
  return STEPS.indexOf(mapped as OrderStatus);
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ─── Vertical stepper ────────────────────────────────────────────────────────

function OrderStepper({ status }: { status: OrderStatus }) {
  const currentIdx = getStepIndex(status);
  const isDelivered = status === "order_delivered";

  return (
    <div>
      {STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const active = idx === currentIdx;
        const last = idx === STEPS.length - 1;
        const Icon = STATUS_ICON[step];

        return (
          <div key={step} className="flex gap-4">
            <div className="flex flex-col items-center" style={{ width: 40, minWidth: 40 }}>
              <div
                className={`
                  flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2
                  transition-all duration-500
                  ${active
                    ? isDelivered
                      ? "border-green-500 bg-green-500 text-white shadow-md"
                      : "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : done
                    ? "border-primary/30 bg-primary/8 text-primary"
                    : "border-border bg-background text-border"
                  }
                `}
                style={{ position: "relative" }}
              >
                {done
                  ? <Icon className="h-4 w-4" />
                  : <span className="font-body text-[11px] font-bold">{idx + 1}</span>
                }
                {active && !isDelivered && (
                  <span
                    className="absolute inset-0 rounded-full bg-primary opacity-20 animate-ping"
                    style={{ animationDuration: "2s" }}
                  />
                )}
              </div>
              {!last && (
                <div
                  className={`mt-1 w-0.5 rounded-full transition-colors duration-500 ${
                    idx < currentIdx ? "bg-primary/30" : "bg-border"
                  }`}
                  style={{ flex: 1, minHeight: 28 }}
                />
              )}
            </div>
            <div className={`flex flex-col justify-center ${last ? "pb-0" : "pb-5"}`} style={{ paddingTop: 8 }}>
              <div className="flex items-center gap-2">
                <p className={`font-body text-sm font-semibold leading-none ${
                  active
                    ? isDelivered ? "text-green-700" : "text-primary"
                    : done ? "text-foreground" : "text-muted-foreground/40"
                }`}>
                  {STEP_LABELS[step]}
                </p>
                {active && (
                  <span className={`rounded-full px-2 py-0.5 font-body text-[10px] font-semibold ${
                    isDelivered ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"
                  }`}>
                    Now
                  </span>
                )}
              </div>
              <p className={`mt-0.5 font-body text-xs ${
                done ? "text-muted-foreground" : "text-muted-foreground/30"
              }`}>
                {STEP_SUB[step]}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Cancel confirmation dialog ───────────────────────────────────────────────

function CancelDialog({
  orderId,
  onConfirm,
  onClose,
}: {
  orderId: string;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const REASONS = [
    "Changed my mind",
    "Ordered by mistake",
    "Found a better price",
    "Delivery time too long",
    "Other",
  ];

  const handleConfirm = async () => {
    if (!reason) return;
    setLoading(true);
    await onConfirm(reason);
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-card shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="font-heading text-sm font-semibold text-foreground">Cancel Order</p>
            <p className="font-body text-xs text-muted-foreground">This action cannot be undone</p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="font-body text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Reason for cancellation
          </p>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label key={r} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-primary"
                />
                <span className="font-body text-sm text-foreground">{r}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-full"
            onClick={onClose}
            disabled={loading}
          >
            Keep Order
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1 rounded-full gap-1.5"
            onClick={handleConfirm}
            disabled={!reason || loading}
          >
            {loading
              ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Cancelling...</>
              : <><XCircle className="h-3.5 w-3.5" />Cancel Order</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { toast } = useToast();

  const isDelivered  = order.status === "order_delivered";
  const isCancelled  = order.status === "order_cancelled";
  const canCancel    = order.status === "order_placed";

  const visibleHistory = order.statusHistory?.filter((h) => h.status !== "meesho_ordered") ?? [];
  const totalQty = order.items.reduce((s, i) => s + i.cartQuantity, 0);
  const Icon = STATUS_ICON[order.status];

  const handleCancelConfirm = async (reason: string) => {
    const now = Date.now();
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: "order_cancelled",
        updatedAt: now,
        cancelledAt: now,
        cancellationReason: reason,
        statusHistory: [
          ...(order.statusHistory ?? []),
          { status: "order_cancelled", timestamp: now, note: reason },
        ],
      });
      toast({ title: "Order cancelled successfully" });
    } catch (e) {
      toast({ title: "Failed to cancel order. Please try again.", variant: "destructive" });
    }
    setShowCancelDialog(false);
  };

  return (
    <>
      {showCancelDialog && (
        <CancelDialog
          orderId={order.id}
          onConfirm={handleCancelConfirm}
          onClose={() => setShowCancelDialog(false)}
        />
      )}

      <div className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
        isCancelled
          ? "border-destructive/20 bg-card"
          : isDelivered
          ? "border-green-200 bg-card"
          : "border-border bg-card"
      }`}>

        {/* Header strip */}
        <div className={`flex items-center justify-between gap-3 px-5 py-3 ${
          isCancelled
            ? "bg-destructive/5"
            : isDelivered
            ? "bg-green-50"
            : "bg-muted/40"
        }`}>
          <span className="font-mono text-[11px] tracking-widest text-muted-foreground">
            #{order.paymentId.slice(-10).toUpperCase()}
          </span>
          <div className="flex items-center gap-3">
            <span className="font-body text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
            <span className="font-heading text-sm font-bold text-foreground">
              ₹{order.amount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Summary */}
        <div
          className="flex cursor-pointer items-start justify-between gap-4 px-5 py-4"
          onClick={() => setExpanded((p) => !p)}
        >
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-body text-sm font-semibold leading-relaxed text-foreground">
              {order.items.map((i) => `${i.name}${i.selectedSize ? ` (${i.selectedSize})` : ""}`).join(", ")}
            </p>
            <p className="mt-0.5 font-body text-xs text-muted-foreground">
              {totalQty} item{totalQty > 1 ? "s" : ""} · Free shipping
            </p>

            {/* Status pill */}
            <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-body text-xs font-semibold ${
              isCancelled
                ? "border-destructive/20 bg-destructive/5 text-destructive"
                : isDelivered
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-primary/20 bg-primary/5 text-primary"
            }`}>
              <Icon className="h-3.5 w-3.5" />
              {STEP_LABELS[order.status]}
            </div>

            {/* Cancellation reason */}
            {isCancelled && order.cancellationReason && (
              <p className="mt-1.5 font-body text-xs text-muted-foreground">
                Reason: {order.cancellationReason}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {canCancel && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowCancelDialog(true); }}
                className="flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/5 px-2.5 py-1 font-body text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/10"
              >
                <XCircle className="h-3 w-3" />
                Cancel
              </button>
            )}
            <button className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Expanded */}
        {expanded && (
          <div className="divide-y divide-border/60 border-t border-border/60">

            {/* Stepper (skip for cancelled) */}
            {!isCancelled && (
              <div className="px-5 py-5">
                <p className="mb-4 font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Order Progress
                </p>
                <OrderStepper status={order.status} />
              </div>
            )}

            {/* Status message */}
            {STATUS_META[order.status] && (
              <div className={`px-5 py-4 ${
                isCancelled
                  ? "bg-destructive/[0.03]"
                  : isDelivered
                  ? "bg-green-50/60"
                  : "bg-primary/[0.03]"
              }`}>
                <p className={`font-body text-xs leading-relaxed ${
                  isCancelled ? "text-destructive/80" : isDelivered ? "text-green-800" : "text-foreground/80"
                }`}>
                  {isCancelled
                    ? `Your order has been cancelled${order.cancellationReason ? ` (${order.cancellationReason})` : ""}. If you were charged, a refund will be processed within 5–7 business days.`
                    : STATUS_META[order.status]?.message
                  }
                </p>
              </div>
            )}

            {/* Items */}
            <div className="px-5 py-4">
              <p className="mb-3 font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Items</p>
              <div className="space-y-3">
                {order.items.map((item: OrderItem, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-body text-sm text-foreground">{item.name}</p>
                        <p className="font-body text-xs text-muted-foreground">
                          {item.selectedSize ? `Size ${item.selectedSize} · ` : ""}Qty {item.cartQuantity}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-body text-sm font-semibold text-foreground">
                      ₹{(item.price * item.cartQuantity).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                <span className="font-body text-xs text-muted-foreground">Total paid</span>
                <span className="font-heading text-base font-bold text-foreground">
                  ₹{order.amount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Address */}
            <div className="px-5 py-4">
              <p className="mb-3 font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Delivery Address</p>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <p className="font-body text-sm leading-relaxed text-foreground">
                  {order.address.fullName}<br />
                  {order.address.street}, {order.address.city}<br />
                  {order.address.state} — {order.address.pincode}<br />
                  <span className="text-muted-foreground">{order.address.phone}</span>
                </p>
              </div>
            </div>

            {/* Activity timeline */}
            {visibleHistory.length > 0 && (
              <div className="px-5 py-4">
                <p className="mb-3 font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Activity</p>
                <div className="space-y-3">
                  {[...visibleHistory].reverse().map((h, i) => {
                    const meta = STATUS_META[h.status as OrderStatus];
                    const HIcon = STATUS_ICON[h.status as OrderStatus];
                    const label = meta?.label ?? STEP_LABELS[h.status as OrderStatus] ?? h.status;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          h.status === "order_cancelled" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                        }`}>
                          {HIcon && <HIcon className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-body text-xs font-semibold text-foreground">{label}</p>
                          {h.note && h.status === "order_cancelled" && (
                            <p className="font-body text-[11px] text-muted-foreground">Reason: {h.note}</p>
                          )}
                          <p className="font-body text-[11px] text-muted-foreground">
                            {formatDate(h.timestamp)} at {formatTime(h.timestamp)}
                          </p>
                        </div>
                        {i === 0 && (
                          <span className={`shrink-0 rounded-full px-2 py-0.5 font-body text-[10px] font-semibold ${
                            h.status === "order_cancelled"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary"
                          }`}>
                            Latest
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment ID */}
            <div className="px-5 py-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-body text-[11px] text-muted-foreground">Payment ID:</span>
                <span className="font-mono text-[11px] text-muted-foreground">{order.paymentId}</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "delivered" | "cancelled">("all");

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    const q = query(
      collection(db, "orders"),
      where("customerEmail", "==", user.email),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    });
  }, [user]);

  const activeCount    = orders.filter((o) => o.status !== "order_delivered" && o.status !== "order_cancelled").length;
  const deliveredCount = orders.filter((o) => o.status === "order_delivered").length;
  const cancelledCount = orders.filter((o) => o.status === "order_cancelled").length;

  const filtered = orders.filter((o) => {
    if (filter === "active")    return o.status !== "order_delivered" && o.status !== "order_cancelled";
    if (filter === "delivered") return o.status === "order_delivered";
    if (filter === "cancelled") return o.status === "order_cancelled";
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 pb-24 md:pb-12">

        <div className="border-b border-border bg-card/50">
          <div className="mx-auto max-w-2xl px-4 py-8">
            <h1 className="font-heading text-3xl font-bold text-foreground">My Orders</h1>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              Track and manage your Urban Dhage purchases
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-4 py-6">

          {/* Filter tabs */}
          {!loading && orders.length > 0 && (
            <div className="mb-6 flex w-fit gap-1 rounded-full border border-border bg-muted/40 p-1">
              {([
                ["all",       `All (${orders.length})`],
                ["active",    `Active (${activeCount})`],
                ["delivered", `Delivered (${deliveredCount})`],
                ...(cancelledCount > 0 ? [["cancelled", `Cancelled (${cancelledCount})`]] as const : []),
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`rounded-full px-4 py-1.5 font-body text-xs font-semibold transition-all ${
                    filter === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Skeleton */}
          {loading && (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-border">
                  <div className="h-10 animate-pulse bg-muted/60" />
                  <div className="space-y-3 p-5">
                    <div className="h-4 w-3/4 animate-pulse rounded-lg bg-muted" />
                    <div className="h-3 w-1/3 animate-pulse rounded-lg bg-muted" />
                    <div className="mt-2 h-7 w-28 animate-pulse rounded-full bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && orders.length === 0 && (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <ShoppingBag className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">No orders yet</h2>
              <p className="mt-2 font-body text-sm text-muted-foreground">
                Your orders will appear here once you make a purchase.
              </p>
              <Link to="/">
                <Button className="mt-6 rounded-full px-6">Start Shopping</Button>
              </Link>
            </div>
          )}

          {/* Orders list */}
          {!loading && filtered.length > 0 && (
            <div className="space-y-4">
              {filtered.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}

          {/* Empty filter state */}
          {!loading && orders.length > 0 && filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="font-body text-sm text-muted-foreground">No {filter} orders found.</p>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}
