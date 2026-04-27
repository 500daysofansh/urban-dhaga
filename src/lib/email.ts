const SERVICE_ID = "service_6ayn8y6";
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string;
const CUST_TPL   = "template_fqu1999";
const ADMIN_TPL  = "template_bv8hdi4";

export interface OrderEmailData {
  customerName:  string;
  customerEmail: string;
  paymentId:     string;
  amount:        number;
  addressLine:   string;
  itemsSummary:  string;
}

async function sendTemplate(templateId: string, params: Record<string, string>) {
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id:  SERVICE_ID,
      template_id: templateId,
      user_id:     PUBLIC_KEY,
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