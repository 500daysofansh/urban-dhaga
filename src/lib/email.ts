import { OrderStatus } from "@/types/order";

const SERVICE_ID = "service_6ayn8y6";
const PUBLIC_KEY = "a5MUx20kzvERzjdBr";
const CUST_TPL   = "template_fqu1999";
const ADMIN_TPL  = "template_bv8hdi4";

// Create this template in your EmailJS dashboard
const STATUS_TPL = "template_status_update";

export interface OrderEmailData {
  customerName:  string;
  customerEmail: string;
  paymentId:     string;
  amount:        number;
  addressLine:   string;
  itemsSummary:  string;
}

export interface StatusEmailData {
  customerName:  string;
  customerEmail: string;
  orderId:       string;
  paymentId:     string;
  status:        OrderStatus;
  note?:         string;
}

async function sendTemplate(templateId: string, params: Record<string, string>) {
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id:      SERVICE_ID,
      template_id:     templateId,
      user_id:         PUBLIC_KEY,
      template_params: params,
    }),
  });
  if (!res.ok) throw new Error(`EmailJS error: ${await res.text()}`);
}

export async function sendOrderEmails(data: OrderEmailData) {
  const amount = `₹${data.amount.toLocaleString("en-IN")}`;
  await Promise.all([
    sendTemplate(CUST_TPL, {
      to_name:          data.customerName,
      to_email:         data.customerEmail,
      payment_id:       data.paymentId,
      amount,
      delivery_address: data.addressLine,
      items_summary:    data.itemsSummary,
    }),
    sendTemplate(ADMIN_TPL, {
      customer_name:    data.customerName,
      customer_email:   data.customerEmail,
      payment_id:       data.paymentId,
      amount,
      delivery_address: data.addressLine,
      items_summary:    data.itemsSummary,
    }),
  ]);
}

// Human-readable labels and messages for each status.
// emoji field removed — UI now uses SVG icons via STATUS_SVG in MyOrders.tsx.
// Email templates receive status_label as plain text.
export const STATUS_META: Record<OrderStatus, { label: string; message: string }> = {
  order_placed: {
    label:   "Order Placed",
    message: "Your order has been placed successfully! We have received your payment and will start processing it shortly.",
  },
  meesho_ordered: {
    label:   "Order Confirmed",
    message: "Great news! Your order has been placed with our supplier and is being prepared for dispatch.",
  },
  order_processed: {
    label:   "Order Processed",
    message: "Your order has been processed and is being prepared for shipment. We'll notify you as soon as it ships!",
  },
  order_shipped: {
    label:   "Order Shipped",
    message: "Your order is on its way! It has been handed over to our delivery partner and will reach you soon.",
  },
  out_for_delivery: {
    label:   "Out for Delivery",
    message: "Your order is out for delivery today. Please keep your phone handy for the delivery executive.",
  },
  order_delivered: {
    label:   "Order Delivered",
    message: "Your order has been delivered successfully! We hope you love your purchase. Thank you for shopping with Urban Dhage!",
  },
};

export async function sendStatusEmail(data: StatusEmailData) {
  const meta = STATUS_META[data.status];
  await sendTemplate(STATUS_TPL, {
    to_name:        data.customerName,
    to_email:       data.customerEmail,
    order_id:       data.orderId,
    payment_id:     data.paymentId,
    status_label:   meta.label,
    status_message: meta.message,
    note:           data.note || "",
  });
}
