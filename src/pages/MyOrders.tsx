import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Order, OrderStatus, OrderItem } from "@/types/order";
import { STATUS_META } from "@/lib/email";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Package, ChevronDown, ChevronUp, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const STATUS_ORDER: OrderStatus[] = [
  "order_placed",
  "meesho_ordered",
  "order_processed",
  "order_shipped",
  "out_for_delivery",
  "order_delivered",
];

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status];
  const colors: Record<OrderStatus, string> = {
    order_placed:      "bg-gray-100 text-gray-700",
    meesho_ordered:    "bg-blue-50 text-blue-700",
    order_processed:   "bg-yellow-50 text-yellow-700",
    order_shipped:     "bg-orange-50 text-orange-700",
    out_for_delivery:  "bg-purple-50 text-purple-700",
    order_delivered:   "bg-green-50 text-green-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[status]}`}>
      {meta.emoji} {meta.label}
    </span>
  );
}

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const currentIdx = STATUS_ORDER.indexOf(order.status);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">

      {/* Header */}
      <div
        className="flex items-start justify-between px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">#{order.paymentId.slice(-8).toUpperCase()}</span>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
          <p className="text-xs text-muted-foreground">{order.items.length} item{order.items.length > 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          <span className="font-bold text-sm">₹{order.amount.toLocaleString("en-IN")}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Progress bar — always visible */}
      <div className="px-5 pb-4">
        <div className="flex items-center">
          {STATUS_ORDER.map((s, idx) => {
            const done = idx <= currentIdx;
            const isLast = idx === STATUS_ORDER.length - 1;
            return (
              <div key={s} className="flex items-center flex-1 min-w-0">
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-500
                    ${done ? "bg-primary scale-110" : "bg-muted-foreground/25"}`}
                />
                {!isLast && (
                  <div className={`h-0.5 flex-1 transition-all duration-500 ${idx < currentIdx ? "bg-primary" : "bg-muted-foreground/20"}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5">
          {STATUS_ORDER.map((s, idx) => (
            <span
              key={s}
              className={`text-[9px] text-center leading-tight transition-colors
                ${idx <= currentIdx ? "text-primary font-semibold" : "text-muted-foreground"}`}
              style={{ width: `${100 / STATUS_ORDER.length}%` }}
            >
              {STATUS_META[s].emoji}
            </span>
          ))}
        </div>
        {/* Current status message */}
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          {STATUS_META[order.status].message}
        </p>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">

          {/* Items */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Items Ordered</p>
            <div className="space-y-1.5">
              {order.items.map((item: OrderItem, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-foreground">
                    {item.name}{item.selectedSize ? ` (${item.selectedSize})` : ""} × {item.cartQuantity}
                  </span>
                  <span className="text-muted-foreground">₹{(item.price * item.cartQuantity).toLocaleString("en-IN")}</span>
                </div>
              ))}
              <div className="border-t border-border pt-1.5 flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span>₹{order.amount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Delivery address */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Delivery Address</p>
            <p className="text-sm text-foreground leading-relaxed">
              {order.address.fullName}, {order.address.phone}<br />
              {order.address.street}, {order.address.city}<br />
              {order.address.state} — {order.address.pincode}
            </p>
          </div>

          {/* Status history */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Status History</p>
            <div className="space-y-1.5">
              {[...order.statusHistory].reverse().map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span>{STATUS_META[h.status as OrderStatus]?.emoji}</span>
                    <span className="text-foreground">{STATUS_META[h.status as OrderStatus]?.label}</span>
                  </span>
                  <span className="text-muted-foreground">{formatDate(h.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default function MyOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }

    const q = query(
      collection(db, "orders"),
      where("customerEmail", "==", user.email),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    });

    return unsub;
  }, [user]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 pb-24 md:pb-8">
        <h1 className="font-heading text-2xl font-bold mb-6">My Orders</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
            <Link to="/">
              <Button>Start Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
