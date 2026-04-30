import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Order, OrderStatus, OrderItem } from "@/types/order";
import { STATUS_META } from "@/lib/email";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShoppingBag, ChevronDown, ChevronUp, MapPin, CreditCard, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── SVG icons for each order status ─────────────────────────────────────────

const IconOrderPlaced = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
    <path d="M3 6h18"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

const IconProcessing = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);

const IconShipped = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <polyline points="3.29 7 12 12 20.71 7"/>
    <line x1="12" y1="22" x2="12" y2="12"/>
  </svg>
);

const IconOutForDelivery = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="1"/>
    <path d="M16 8h4l3 5v3h-7V8Z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

const IconDelivered = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const IconConfirmed = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// Map status → SVG component
const STATUS_SVG: Record<OrderStatus, React.FC<{ className?: string }>> = {
  order_placed:     IconOrderPlaced,
  order_processed:  IconProcessing,
  meesho_ordered:   IconConfirmed,
  order_shipped:    IconShipped,
  out_for_delivery: IconOutForDelivery,
  order_delivered:  IconDelivered,
};

// ─── Step config ──────────────────────────────────────────────────────────────

const CUSTOMER_STEPS: OrderStatus[] = [
  "order_placed",
  "order_processed",
  "order_shipped",
  "out_for_delivery",
  "order_delivered",
];

const STEP_LABELS: Record<OrderStatus, string> = {
  order_placed:     "Placed",
  order_processed:  "Processing",
  order_shipped:    "Shipped",
  out_for_delivery: "Out for Delivery",
  order_delivered:  "Delivered",
  meesho_ordered:   "Confirmed",
};

function getCustomerStepIndex(status: OrderStatus): number {
  const mapped = status === "meesho_ordered" ? "order_processed" : status;
  return CUSTOMER_STEPS.indexOf(mapped);
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const currentIdx = getCustomerStepIndex(order.status);
  const isDelivered = order.status === "order_delivered";
  const visibleHistory = order.statusHistory.filter((h) => h.status !== "meesho_ordered");

  return (
    <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${isDelivered ? "border border-green-200 bg-green-50/30" : "border border-border bg-card"}`}>

      {/* Top strip */}
      <div className={`px-5 py-3 flex items-center justify-between text-xs font-body ${isDelivered ? "bg-green-100/50" : "bg-muted/40"}`}>
        <span className="font-mono text-muted-foreground tracking-wider">#{order.paymentId.slice(-10).toUpperCase()}</span>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">{formatDate(order.createdAt)}</span>
          <span className="font-semibold text-foreground text-sm">₹{order.amount.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Items + tracker */}
      <div className="px-5 py-4 cursor-pointer" onClick={() => setExpanded((p) => !p)}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground line-clamp-2 font-body leading-relaxed">
              {order.items.map((i) => `${i.name}${i.selectedSize ? ` (${i.selectedSize})` : ""}`).join(", ")}
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-body">
              {order.items.reduce((sum, i) => sum + i.cartQuantity, 0)} item{order.items.reduce((sum, i) => sum + i.cartQuantity, 0) > 1 ? "s" : ""} · Free shipping
            </p>
          </div>
          <button className="shrink-0 rounded-full p-1 hover:bg-muted transition-colors">
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>

        {/* Progress tracker */}
        <div className="mt-5">
          <div className="relative">
            {/* Background track */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-border" />
            {/* Progress fill */}
            <div
              className="absolute top-4 left-4 h-0.5 bg-primary transition-all duration-700"
              style={{ width: currentIdx <= 0 ? "0%" : `${(currentIdx / (CUSTOMER_STEPS.length - 1)) * 88}%` }}
            />
            <div className="relative flex justify-between">
              {CUSTOMER_STEPS.map((step, idx) => {
                const done = idx <= currentIdx;
                const active = idx === currentIdx;
                const Icon = STATUS_SVG[step];
                return (
                  <div key={step} className="flex flex-col items-center gap-2" style={{ width: "20%" }}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 relative z-10 ${
                      done
                        ? active
                          ? "bg-primary text-primary-foreground shadow-md scale-110"
                          : "bg-primary/15 text-primary"
                        : "bg-background border-2 border-border text-muted-foreground/40"
                    }`}>
                      {done
                        ? <Icon className="h-4 w-4" />
                        : <span className="text-[10px] font-bold font-body">{idx + 1}</span>
                      }
                    </div>
                    <span
                      className={`text-center font-body leading-tight transition-colors ${
                        done ? active ? "text-primary font-semibold" : "text-foreground/70" : "text-muted-foreground/50"
                      }`}
                      style={{ fontSize: "9px" }}
                    >
                      {STEP_LABELS[step]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status message */}
          <div className={`mt-4 rounded-xl px-4 py-3 text-xs font-body leading-relaxed ${isDelivered ? "bg-green-100/60 text-green-800" : "bg-primary/5 text-foreground/80"}`}>
            {STATUS_META[order.status]?.message || STATUS_META["order_placed"].message}
          </div>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-border/60 divide-y divide-border/60">

          {/* Items */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 font-body">Order Items</p>
            <div className="space-y-2.5">
              {order.items.map((item: OrderItem, i: number) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-body text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground font-body">{item.selectedSize ? `Size: ${item.selectedSize} · ` : ""}Qty: {item.cartQuantity}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0 font-body">₹{(item.price * item.cartQuantity).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border/60 flex justify-between items-center">
              <span className="text-xs text-muted-foreground font-body">Total paid</span>
              <span className="font-bold text-foreground font-body">₹{order.amount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Address */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 font-body">Delivery Address</p>
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm font-body text-foreground leading-relaxed">
                {order.address.fullName}<br />
                {order.address.street}, {order.address.city}<br />
                {order.address.state} — {order.address.pincode}<br />
                <span className="text-muted-foreground">{order.address.phone}</span>
              </p>
            </div>
          </div>

          {/* Timeline */}
          {visibleHistory.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 font-body">Status Timeline</p>
              <div className="space-y-2.5">
                {[...visibleHistory].reverse().map((h, i) => {
                  const meta = STATUS_META[h.status as OrderStatus];
                  if (!meta) return null;
                  const Icon = STATUS_SVG[h.status as OrderStatus];
                  return (
                    <div key={i} className="flex items-center gap-3">
                      {/* SVG icon in a small circle instead of emoji */}
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground font-body">{meta.label}</p>
                        <p className="text-[11px] text-muted-foreground font-body">{formatDate(h.timestamp)} at {formatTime(h.timestamp)}</p>
                      </div>
                      {i === 0 && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full font-body">Latest</span>
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
              <span className="text-[11px] text-muted-foreground font-body">Payment ID:</span>
              <span className="text-[11px] font-mono text-muted-foreground">{order.paymentId}</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "delivered">("all");

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

  const filtered = orders.filter((o) => {
    if (filter === "active") return o.status !== "order_delivered";
    if (filter === "delivered") return o.status === "order_delivered";
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 pb-24 md:pb-12">
        <div className="border-b border-border bg-card/50">
          <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="font-heading text-3xl font-bold text-foreground">My Orders</h1>
            <p className="text-sm text-muted-foreground font-body mt-1">Track and manage your Urban Dhage purchases</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          {!loading && orders.length > 0 && (
            <div className="flex gap-2 mb-6 p-1 bg-muted/50 rounded-full w-fit">
              {(["all", "active", "delivered"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold font-body transition-all capitalize ${
                    filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all"
                    ? `All (${orders.length})`
                    : f === "active"
                    ? `Active (${orders.filter((o) => o.status !== "order_delivered").length})`
                    : `Delivered (${orders.filter((o) => o.status === "order_delivered").length})`}
                </button>
              ))}
            </div>
          )}

          {/* Skeleton */}
          {loading && (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-border overflow-hidden">
                  <div className="h-10 bg-muted/60 animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-muted animate-pulse rounded-lg w-3/4" />
                    <div className="h-3 bg-muted animate-pulse rounded-lg w-1/3" />
                    <div className="h-16 bg-muted/50 animate-pulse rounded-xl mt-4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && orders.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground mb-2">No orders yet</h2>
              <p className="text-sm text-muted-foreground font-body mb-6">Your orders will appear here once you make a purchase.</p>
              <Link to="/"><Button className="rounded-full px-6">Start Shopping</Button></Link>
            </div>
          )}

          {/* Orders list */}
          {!loading && filtered.length > 0 && (
            <div className="space-y-4">
              {filtered.map((order) => <OrderCard key={order.id} order={order} />)}
            </div>
          )}

          {/* No results for filter */}
          {!loading && orders.length > 0 && filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground font-body">No {filter} orders found.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
