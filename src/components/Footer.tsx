import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { toast } from "sonner";

const QUICK_LINKS = [
  { name: "New Arrivals", category: "New Arrivals" },
  { name: "Sarees", category: "Sarees" },
  { name: "Kurtas", category: "Kurtas" },
  { name: "Dupattas", category: "Dupattas" },
  { name: "Accessories", category: "Accessories" },
];

const InstagramIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const Footer = () => {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast.success("Thanks for subscribing! You'll receive updates on new arrivals and exclusive offers.");
      setEmail("");
    }
  };

  const handleCategoryClick = (category: string) => {
    window.dispatchEvent(new CustomEvent("filter-category", { detail: category }));
    const el = document.getElementById("products");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="border-t bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Top: Logo + tagline */}
        <div className="mb-12 text-center">
          <h3 className="text-2xl font-bold font-heading">
            Urban <span className="text-saffron">Dhage</span>
          </h3>
          <p className="mt-2 text-sm text-background/60 font-body">
            Handcrafted Indian Fashion · Where Tradition Meets Style
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-background/80 font-body">Quick Links</h4>
            <ul className="space-y-2.5 text-sm text-background/60 font-body">
              {QUICK_LINKS.map((link) => (
                <li key={link.name}>
                  <button
                    onClick={() => handleCategoryClick(link.category)}
                    className="hover:text-saffron transition-colors cursor-pointer"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-background/80 font-body">Customer Care</h4>
            <ul className="space-y-2.5 text-sm text-background/60 font-body">
              <li><Link to="/cart" className="hover:text-saffron transition-colors">Shipping Info</Link></li>
              <li><Link to="/cart" className="hover:text-saffron transition-colors">Returns & Exchanges</Link></li>
              <li><button onClick={() => handleCategoryClick("New Arrivals")} className="hover:text-saffron transition-colors">Size Guide</button></li>
              <li><a href="https://wa.me/918419856013" target="_blank" rel="noopener noreferrer" className="hover:text-saffron transition-colors">Contact Us</a></li>
              <li><button onClick={() => toast.info("FAQ section coming soon!")} className="hover:text-saffron transition-colors">FAQs</button></li>
            </ul>
          </div>

          {/* Follow Us */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-background/80 font-body">Follow Us</h4>
            <ul className="space-y-2.5 text-sm text-background/60 font-body">
              <li>
                
                  href="https://www.instagram.com/urban_dhage_/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-saffron transition-colors flex items-center gap-2"
                >
                  <InstagramIcon />
                  Instagram
                </a>
              </li>
              <li><a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" className="hover:text-saffron transition-colors">📌 Pinterest</a></li>
              <li><a href="https://wa.me/918419856013" target="_blank" rel="noopener noreferrer" className="hover:text-saffron transition-colors">💬 WhatsApp</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-background/80 font-body">Newsletter</h4>
            <p className="text-sm text-background/60 font-body mb-4">
              Get updates on new arrivals and exclusive offers.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="flex-1 rounded-full bg-background/10 border border-background/20 px-4 py-2 text-sm text-background placeholder:text-background/40 outline-none focus:border-saffron font-body"
                required
              />
              <Button type="submit" size="icon" className="rounded-full bg-saffron hover:bg-saffron/90 shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Payment icons */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-xs text-background/40 font-body">
          <span className="px-3 py-1 border border-background/20 rounded">UPI</span>
          <span className="px-3 py-1 border border-background/20 rounded">VISA</span>
          <span className="px-3 py-1 border border-background/20 rounded">Mastercard</span>
          <span className="px-3 py-1 border border-background/20 rounded">COD</span>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-background/10 pt-8 text-center text-sm text-background/40 font-body">
          <p>Made with ❤️ for Indian Artisans</p>
          <p className="mt-1">&copy; {new Date().getFullYear()} Urban Dhage. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
