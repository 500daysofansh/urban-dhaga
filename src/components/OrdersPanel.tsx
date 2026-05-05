import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Order, OrderStatus } from "@/types/order";
import { STATUS_META } from "@/lib/email";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronDown, ChevronUp, Package } from "lucide-react";

// Progress steps — cancelled is separate, not part of the linear flow
const STATUS_ORDER: OrderStatus[] = [
  "order_placed",
  "meesho_ordered",
  "order_processed",
  "order_shipped",
  "out_for_delivery",
  "order_delivered",
];

// Admin-actionable forward transitions (never include order_cancelled —
// admins should not be able to mark an order cancelled from here)
const STATUS_BUTTONS: { status: OrderStatus; color: string }[] = [
  { status: "meesho_ordered",   color: "bg-blue-500 hover:bg-blue-600" },
  { status: "order_processed",  color: "bg-yellow-500 hover:bg-yellow-600" },
  { status: "order_shipped",    color: "bg-orange-500 hover:bg-orange-600" },
  { status: "out_for_delivery", color: "bg-purple-500 hover:bg-purple-600" },
  { status: "order_delivered",  color: "bg-green-500 hover:bg-green-600" },
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
    order_placed:     "bg-gray-100 text-gray-700 border-gray-200",
    meesho_ordered:   "bg-blue-50 text-blue-700 border-blue-200",
    order_processed:  "bg-yellow-50 text-yellow-700 border-yellow-200",
    order_shipped:    "bg-orange-50 text-orange-700 border-orange-200",
    out_for_delivery: "bg-purple-50 text-purple-700 border-purple-200",
    order_delivered:  "bg-green-50 text-green-700 border-green-200",
    order_cancelled:  "bg-red-50 text-red-600 border-red-200",
  };
  const icons: Record<OrderStatus, string> = {
    order_placed:     "🛒",
    meesho_ordered:   "✅",
    order_processed:  "⚙️",
    order_shipped:    "📦",
    out_for_delivery: "🚚",
    order_delivered:  "🎉",
    order_cancelled:  "✕",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors[status]}`}>
      <span>{icons[status]}</span>
      {meta.label}
    </span>
  );
}

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState<OrderStatus | null>(null);
  const { toast } = useToast();

  const isCancelled = order.status === "order_cancelled";
  const isDelivered = order.status === "order_delivered";
  const isFinal     = isCancelled || isDelivered;

  const currentIdx = STATUS_ORDER.indexOf(order.status); // -1 for cancelled

  const handleUpdate = async (newStatus: OrderStatus) => {
    setUpdating(newStatus);
    const now = Date.now();
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: newStatus,
        updatedAt: now,
        statusHistory: [...order.statusHistory, { status: newStatus, timestamp: now }],
      });
      toast({ title: `Updated to "${STATUS_META[newStatus].label}"` });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className={`overflow-hidden rounded-xl border bg-card shadow-sm ${
      isCancelled ? "border-red-200" : "border-border"
    }`}>
      {/* Header row */}
      <div
        className="flex cursor-pointer items-start justify-between px-5 py-4 transition-colors hover:bg-muted/30"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm">{order.customerName}</span>
            <StatusBadge status={order.status} />
            {isCancelled && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-500 border border-red-200">
                Customer cancelled
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
          <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
          {isCancelled && order.cancellationReason && (
            <p className="text-xs text-red-500">Reason: {order.cancellationReason}</p>
          )}
        </div>
        <div className="ml-4 flex shrink-0 items-center gap-3">
          <span className={`font-bold text-sm ${isCancelled ? "line-through text-muted-foreground" : ""}`}>
            ₹{order.amount.toLocaleString("en-IN")}
          </span>
          {expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="space-y-5 border-t border-border px-5 py-4">

          {/* Items */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</p>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>
                  {item.name}{item.selectedSize ? ` (${item.selectedSize})` : ""} × {item.cartQuantity}
                </span>
                <span className="text-muted-foreground">
                  ₹{(item.price * item.cartQuantity).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>

          {/* Address */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Delivery Address
            </p>
            <p className="text-sm leading-relaxed">
              {order.address.fullName}, {order.address.phone}<br />
              {order.address.street}, {order.address.city}<br />
              {order.address.state} — {order.address.pincode}
            </p>
          </div>

          {/* Payment ID */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Payment ID
            </p>
            <p className="font-mono text-xs text-muted-foreground">{order.paymentId}</p>
          </div>

          {/* Cancellation details */}
          {isCancelled && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-1">
                Cancellation Details
              </p>
              <p className="text-sm text-red-700">
                Cancelled on {order.cancelledAt ? formatDate(order.cancelledAt) : "—"}
              </p>
              {order.cancellationReason && (
                <p className="text-sm text-red-700">Reason: {order.cancellationReason}</p>
              )}
              <p className="mt-1 text-xs text-red-500">
                Refund to be processed within 5–7 business days if applicable.
              </p>
            </div>
          )}

          {/* Progress bar — only for non-cancelled orders */}
          {!isCancelled && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Progress
              </p>
              <div className="flex items-center">
                {STATUS_ORDER.map((s, idx) => {
                  const done = idx <= currentIdx;
                  return (
                    <div key={s} className="flex flex-1 items-center min-w-0">
                      <div className={`h-3 w-3 shrink-0 rounded-full ${done ? "bg-primary" : "bg-muted-foreground/25"}`} />
                      {idx < STATUS_ORDER.length - 1 && (
                        <div className={`h-0.5 flex-1 ${idx < currentIdx ? "bg-primary" : "bg-muted-foreground/20"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status update buttons — hidden for cancelled and delivered */}
          {!isFinal && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Update Status
              </p>
              <div className="flex flex-wrap gap-2">
                {STATUS_BUTTONS.map(({ status, color }) => {
                  const idx = STATUS_ORDER.indexOf(status);
                  const isDone = idx <= currentIdx;
                  const isNext = idx === currentIdx + 1;
                  return (
                    <button
                      key={status}
                      onClick={() => handleUpdate(status)}
                      disabled={isDone || !!updating}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all
                        ${isDone
                          ? "cursor-not-allowed bg-muted text-muted-foreground opacity-40"
                          : isNext
                          ? `${color} text-white shadow-sm`
                          : "border border-border bg-background text-foreground hover:bg-muted"
                        }`}
                    >
                      {updating === status
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : null
                      }
                      {STATUS_META[status].label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isDelivered && (
            <p className="text-sm font-medium text-green-600">✅ Order delivered</p>
          )}

        </div>
      )}
    </div>
  );
}

export default function OrdersPanel() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<OrderStatus | "all">("all");

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    });
  }, []);

  const allStatuses: (OrderStatus | "all")[] = ["all", ...STATUS_ORDER, "order_cancelled"];
  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const counts: Record<string, number> = { all: orders.length };
  allStatuses.forEach((s) => {
    if (s !== "all") counts[s] = orders.filter((o) => o.status === s).length;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {allStatuses.map((key) => {
          const label = key === "all" ? "All" : STATUS_META[key].label;
          const count = counts[key] ?? 0;
          const isCancelledTab = key === "order_cancelled";
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors
                ${filter === key
                  ? isCancelledTab
                    ? "border-red-500 bg-red-500 text-white"
                    : "border-primary bg-primary text-primary-foreground"
                  : isCancelledTab
                  ? "border-red-200 bg-background text-red-500 hover:bg-red-50"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                  filter === key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 opacity-30 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No orders</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      )}
    </div>
  );
}
