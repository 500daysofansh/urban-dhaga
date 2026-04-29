import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Order, OrderStatus } from "@/types/order";
import { STATUS_META } from "@/lib/email";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronDown, ChevronUp, Package } from "lucide-react";

const STATUS_ORDER: OrderStatus[] = [
  "order_placed","meesho_ordered","order_processed","order_shipped","out_for_delivery","order_delivered",
];

const STATUS_BUTTONS: { status: OrderStatus; color: string }[] = [
  { status: "meesho_ordered",   color: "bg-blue-500 hover:bg-blue-600" },
  { status: "order_processed",  color: "bg-yellow-500 hover:bg-yellow-600" },
  { status: "order_shipped",    color: "bg-orange-500 hover:bg-orange-600" },
  { status: "out_for_delivery", color: "bg-purple-500 hover:bg-purple-600" },
  { status: "order_delivered",  color: "bg-green-500 hover:bg-green-600" },
];

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("en-IN", { day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit" });
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status];
  const colors: Record<OrderStatus, string> = {
    order_placed:"bg-gray-100 text-gray-700 border-gray-200",
    meesho_ordered:"bg-blue-50 text-blue-700 border-blue-200",
    order_processed:"bg-yellow-50 text-yellow-700 border-yellow-200",
    order_shipped:"bg-orange-50 text-orange-700 border-orange-200",
    out_for_delivery:"bg-purple-50 text-purple-700 border-purple-200",
    order_delivered:"bg-green-50 text-green-700 border-green-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[status]}`}>
      {meta.emoji} {meta.label}
    </span>
  );
}

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState<OrderStatus | null>(null);
  const { toast } = useToast();
  const currentIdx = STATUS_ORDER.indexOf(order.status);

  const handleUpdate = async (newStatus: OrderStatus) => {
    setUpdating(newStatus);
    const now = Date.now();
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: newStatus, updatedAt: now,
        statusHistory: [...order.statusHistory, { status: newStatus, timestamp: now }],
      });
      toast({ title: `${STATUS_META[newStatus].emoji} Updated to "${STATUS_META[newStatus].label}"` });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-start justify-between px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpanded(p => !p)}>
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{order.customerName}</span>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
          <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          <span className="font-bold text-sm">₹{order.amount.toLocaleString("en-IN")}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Items</p>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.name}{item.selectedSize ? ` (${item.selectedSize})` : ""} × {item.cartQuantity}</span>
                <span className="text-muted-foreground">₹{(item.price * item.cartQuantity).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Delivery Address</p>
            <p className="text-sm leading-relaxed">
              {order.address.fullName}, {order.address.phone}<br/>
              {order.address.street}, {order.address.city}<br/>
              {order.address.state} — {order.address.pincode}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Payment ID</p>
            <p className="text-xs font-mono text-muted-foreground">{order.paymentId}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Progress</p>
            <div className="flex items-center">
              {STATUS_ORDER.map((s, idx) => {
                const done = idx <= currentIdx;
                return (
                  <div key={s} className="flex items-center flex-1 min-w-0">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${done ? "bg-primary" : "bg-muted-foreground/25"}`} />
                    {idx < STATUS_ORDER.length - 1 && <div className={`h-0.5 flex-1 ${idx < currentIdx ? "bg-primary" : "bg-muted-foreground/20"}`} />}
                  </div>
                );
              })}
            </div>
          </div>
          {order.status !== "order_delivered" && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_BUTTONS.map(({ status, color }) => {
                  const idx = STATUS_ORDER.indexOf(status);
                  const isDone = idx <= currentIdx;
                  const isNext = idx === currentIdx + 1;
                  return (
                    <button key={status} onClick={() => handleUpdate(status)} disabled={isDone || !!updating}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                        ${isDone ? "bg-muted text-muted-foreground cursor-not-allowed opacity-40"
                          : isNext ? `${color} text-white shadow-sm`
                          : "bg-background border border-border text-foreground hover:bg-muted"}`}>
                      {updating === status ? <Loader2 className="h-3 w-3 animate-spin" /> : STATUS_META[status].emoji}
                      {STATUS_META[status].label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {order.status === "order_delivered" && <p className="text-green-600 text-sm font-medium">✅ Order delivered</p>}
        </div>
      )}
    </div>
  );
}

export default function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    });
  }, []);

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const counts: Record<string, number> = { all: orders.length };
  STATUS_ORDER.forEach(s => { counts[s] = orders.filter(o => o.status === s).length; });

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[{ key: "all", label: "All" }, ...STATUS_ORDER.map(s => ({ key: s, label: `${STATUS_META[s].emoji} ${STATUS_META[s].label}` }))].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key as OrderStatus | "all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors
              ${filter === key ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}>
            {label}
            {counts[key] > 0 && <span className="ml-1.5 bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full text-[10px]">{counts[key]}</span>}
          </button>
        ))}
      </div>
      {filtered.length === 0
        ? <div className="text-center py-16"><Package className="h-10 w-10 mx-auto mb-3 opacity-30 text-muted-foreground" /><p className="text-sm text-muted-foreground">No orders</p></div>
        : <div className="space-y-3">{filtered.map(o => <OrderCard key={o.id} order={o} />)}</div>
      }
    </div>
  );
}
