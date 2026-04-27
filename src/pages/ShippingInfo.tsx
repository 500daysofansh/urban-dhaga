import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Truck, Clock, MapPin, Package, ArrowLeft, AlertCircle } from "lucide-react";

const ShippingInfo = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">

        <Link to="/" className="mb-8 inline-flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Store
        </Link>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Shipping Info</h1>
        <p className="font-body text-muted-foreground mb-10">Everything you need to know about how we deliver your order.</p>

        <div className="space-y-8">

          {/* Free Shipping */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Free Shipping</h2>
            </div>
            <p className="font-body text-muted-foreground">
              We offer <strong className="text-foreground">free shipping on all orders</strong> across India. No minimum order value, no hidden charges.
            </p>
          </div>

          {/* Delivery Time */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Delivery Timeline</h2>
            </div>
            <div className="space-y-3 font-body text-sm">
              <div className="flex justify-between items-center py-2.5 border-b border-border">
                <span className="text-foreground font-medium">Metro Cities</span>
                <span className="text-muted-foreground">3–5 business days</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-border">
                <span className="text-foreground font-medium">Tier 2 & Tier 3 Cities</span>
                <span className="text-muted-foreground">5–7 business days</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-foreground font-medium">Remote & Rural Areas</span>
                <span className="text-muted-foreground">7–10 business days</span>
              </div>
            </div>
            <p className="mt-4 font-body text-xs text-muted-foreground">
              Business days are Monday–Saturday, excluding public holidays.
            </p>
          </div>

          {/* Coverage */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Delivery Coverage</h2>
            </div>
            <p className="font-body text-muted-foreground">
              We deliver to all <strong className="text-foreground">28 states and 8 union territories</strong> of India. If your pincode is not serviceable, our team will contact you within 24 hours.
            </p>
          </div>

          {/* Packaging */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Packaging</h2>
            </div>
            <p className="font-body text-muted-foreground">
              Every order is carefully packed to protect your garment. Delicate items like sarees and dupattas are wrapped in tissue paper and placed in a sealed poly bag before dispatch.
            </p>
          </div>

          {/* Tracking */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-amber-500/10 p-2.5">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Order Tracking</h2>
            </div>
            <p className="font-body text-muted-foreground">
              Once your order is dispatched, you will receive a tracking link via WhatsApp or email. You can also reach us directly at{" "}
              <a href="mailto:support@urbandhage.in" className="text-primary underline underline-offset-2">support@urbandhage.in</a>{" "}
              or{" "}
              <a href="https://wa.me/918419856013" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">WhatsApp</a>{" "}
              for real-time updates.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ShippingInfo;
