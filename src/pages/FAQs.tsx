import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowLeft, ChevronDown } from "lucide-react";

const faqs = [
  {
    section: "Orders & Payment",
    items: [
      {
        q: "What payment methods do you accept?",
        a: "We accept all major payment methods including UPI (GPay, PhonePe, Paytm), Credit/Debit cards (Visa, Mastercard), Net Banking, and Wallets — all powered by Razorpay.",
      },
      {
        q: "Is it safe to pay on Urban Dhage?",
        a: "Yes, completely. All payments are processed through Razorpay, which is PCI-DSS compliant and uses 256-bit SSL encryption. We never store your card or payment details.",
      },
      {
        q: "Can I modify or cancel my order after placing it?",
        a: "Orders can be cancelled or modified within 12 hours of placing them. Please contact us immediately at support@urbandhage.in or WhatsApp. Once dispatched, orders cannot be cancelled.",
      },
      {
        q: "I didn't receive an order confirmation email. What should I do?",
        a: "Please check your spam/junk folder first. If it's not there, write to us at support@urbandhage.in with your payment ID and we'll resend it.",
      },
    ],
  },
  {
    section: "Shipping & Delivery",
    items: [
      {
        q: "Is shipping free?",
        a: "Yes! We offer free shipping on all orders across India, with no minimum order value.",
      },
      {
        q: "How long does delivery take?",
        a: "Metro cities: 3–5 business days. Tier 2/3 cities: 5–7 business days. Remote areas: 7–10 business days.",
      },
      {
        q: "Do you ship outside India?",
        a: "Currently we only ship within India. International shipping is something we're working on — stay tuned!",
      },
      {
        q: "How do I track my order?",
        a: "Once your order is dispatched, we'll send a tracking link via WhatsApp or email. You can also contact us directly for updates.",
      },
    ],
  },
  {
    section: "Returns & Exchanges",
    items: [
      {
        q: "What is your return policy?",
        a: "We accept returns within 7 days of delivery for damaged, defective, or wrong items. Please visit our Returns & Exchanges page for the full policy.",
      },
      {
        q: "How do I initiate a return?",
        a: "Simply WhatsApp us or email support@urbandhage.in within 7 days of delivery with your order ID and photos of the item. Our team will guide you through the process.",
      },
      {
        q: "When will I get my refund?",
        a: "Once we receive and verify the returned item, refunds are processed within 5–7 business days to your original payment method.",
      },
    ],
  },
  {
    section: "Products",
    items: [
      {
        q: "Are your products handcrafted?",
        a: "Yes! All our products are sourced directly from Indian artisans and weavers. Each piece celebrates a traditional craft — from Kanjivaram weaves to block prints.",
      },
      {
        q: "The colour looks different on my screen. Is that normal?",
        a: "Colours may vary slightly due to screen calibration and lighting. We do our best to photograph products accurately. If there's a significant difference, please contact us.",
      },
      {
        q: "How do I care for my ethnic wear?",
        a: "We recommend dry cleaning for silk sarees and embroidered pieces. For cotton and regular kurtas, gentle hand wash in cold water is advised. Care instructions are included with each order.",
      },
      {
        q: "Do sarees come with a blouse piece?",
        a: "This varies by product — the product description will specify if a blouse piece is included. Check the individual product page for details.",
      },
    ],
  },
];

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="font-body text-sm font-medium text-foreground">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="pb-4 font-body text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
};

const FAQs = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">

        <Link to="/" className="mb-8 inline-flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Store
        </Link>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Frequently Asked Questions</h1>
        <p className="font-body text-muted-foreground mb-10">Can't find your answer? <a href="https://wa.me/918419856013" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">WhatsApp us</a> — we respond fast.</p>

        <div className="space-y-6">
          {faqs.map((section) => (
            <div key={section.section} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-6 py-4">
                <h2 className="font-heading text-base font-semibold text-foreground">{section.section}</h2>
              </div>
              <div className="px-6">
                {section.items.map((item) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="font-heading text-base font-semibold text-foreground mb-1">Still have questions?</p>
          <p className="font-body text-sm text-muted-foreground mb-4">Our team is happy to help you out.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="https://wa.me/918419856013"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-green-500 px-5 py-2 font-body text-sm font-semibold text-white hover:bg-green-600 transition-colors">
              WhatsApp Us
            </a>
            <a href="mailto:support@urbandhage.in"
              className="rounded-full border border-primary px-5 py-2 font-body text-sm font-semibold text-primary hover:bg-primary/10 transition-colors">
              Email Us
            </a>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default FAQs;
