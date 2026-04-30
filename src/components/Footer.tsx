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

const CUSTOMER_CARE_LINKS = [
  { name: "Shipping Info", to: "/shipping" },
  { name: "Returns & Exchanges", to: "/returns" },
  { name: "Size Guide", to: "/size-guide" },
  { name: "My Orders", to: "/my-orders" },
  { name: "Contact Us", href: "https://wa.me/918419856013" },
];

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
              {CUSTOMER_CARE_LINKS.map((link) =>
                link.href ? (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-saffron transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ) : (
                  <li key={link.name}>
                    <Link to={link.to!} className="hover:text-saffron transition-colors">
                      {link.name}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Follow Us */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-background/80 font-body">Follow Us</h4>
            <ul className="space-y-2.5 text-sm text-background/60 font-body">
              <li>
                <a href="https://www.instagram.com/urban_dhage_/" target="_blank" rel="noopener noreferrer" className="hover:text-saffron transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                  Instagram
                </a>
              </li>
              <li>
                <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" className="hover:text-saffron transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.168 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.592 0 12.017 0z"/>
                  </svg>
                  Pinterest
                </a>
              </li>
              <li>
                <a href="https://wa.me/918419856013" target="_blank" rel="noopener noreferrer" className="hover:text-saffron transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </a>
              </li>
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
          <p className="mt-1">© {new Date().getFullYear()} Urban Dhage. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
