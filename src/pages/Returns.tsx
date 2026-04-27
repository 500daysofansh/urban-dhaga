import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RefreshCw, XCircle, CheckCircle, ArrowLeft, MessageCircle } from "lucide-react";

const Returns = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">

        <Link to="/" className="mb-8 inline-flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Store
        </Link>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Returns & Exchanges</h1>
        <p className="font-body text-muted-foreground mb-10">We want you to love what you ordered. Here's our hassle-free policy.</p>

        <div className="space-y-8">

          {/* Policy overview */}
          <div className="rounded-2xl border border-green-200 bg-green-50/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-green-500/10 p-2.5">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-foreground">7-Day Return Window</h2>
            </div>
            <p className="font-body text-muted-foreground">
              You can request a return or exchange within <strong className="text-foreground">7 days of delivery</strong>. Just reach out to us and we'll take it from there.
            </p>
          </div>

          {/* Eligible */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Eligible for Return</h2>
            </div>
            <ul className="space-y-2.5 font-body text-sm text-muted-foreground">
              {[
                "Item received is damaged or defective",
                "Wrong item or wrong size delivered",
                "Item significantly different from the product description",
                "Item arrived with manufacturing defects",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Not eligible */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-destructive/10 p-2.5">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Not Eligible for Return</h2>
            </div>
            <ul className="space-y-2.5 font-body text-sm text-muted-foreground">
              {[
                "Items returned after 7 days of delivery",
                "Items that have been washed, worn, or altered",
                "Items without original tags or packaging",
                "Size issues when the correct size was delivered (please refer to our Size Guide)",
                "Colour variation due to screen/monitor differences",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* How to return */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-4">How to Initiate a Return</h2>
            <ol className="space-y-4 font-body text-sm text-muted-foreground">
              {[
                { step: "1", text: `Contact us within 7 days of delivery via WhatsApp or email at support@urbandhage.in` },
                { step: "2", text: "Share your order/payment ID and photos of the item clearly showing the issue" },
                { step: "3", text: "Our team will review and respond within 24–48 hours" },
                { step: "4", text: "If approved, we'll arrange a pickup or guide you on how to send the item back" },
                { step: "5", text: "Refund or exchange is processed within 5–7 business days of receiving the item" },
              ].map(({ step, text }) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-xs font-bold text-primary">{step}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Refund */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-3">Refund Method</h2>
            <p className="font-body text-sm text-muted-foreground">
              Approved refunds are credited back to your original payment method (UPI, card, etc.) within <strong className="text-foreground">5–7 business days</strong>. Bank processing times may vary.
            </p>
          </div>

          {/* Contact */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground mb-1">Need Help?</h2>
              <p className="font-body text-sm text-muted-foreground">
                Reach us at{" "}
                <a href="mailto:support@urbandhage.in" className="text-primary underline underline-offset-2">support@urbandhage.in</a>
                {" "}or{" "}
                <a href="https://wa.me/918419856013" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">WhatsApp us</a>
                {" "}— we typically respond within a few hours.
              </p>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Returns;
