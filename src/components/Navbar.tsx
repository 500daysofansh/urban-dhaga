import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Menu, X, User, LogOut, Search, ChevronDown, Package } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";

const CATEGORIES = [
  { name: "Sarees" },
  { name: "Kurtas" },
  { name: "Dupattas" },
  { name: "Lehengas" },
  { name: "Accessories" },
  { name: "New Arrivals" },
];

// SVG diamond separator — replaces the ✦ emoji character.
// Inline SVG so it renders identically on every OS/font.
const Diamond = () => (
  <svg
    viewBox="0 0 10 10"
    width="7"
    height="7"
    className="inline-block shrink-0"
    aria-hidden="true"
  >
    <polygon
      points="5,0.5 9.5,5 5,9.5 0.5,5"
      fill="currentColor"
      opacity="0.6"
    />
  </svg>
);

// Marquee items — text + separator interleaved
const MARQUEE_ITEMS = [
  "Handcrafted",
  "Sustainable",
  "Indian",
  "Free Shipping Above ₹999",
  "200+ Artisans",
  "15+ States",
];

const Navbar = () => {
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleCategoryClick = (categoryName: string) => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    window.dispatchEvent(new CustomEvent("filter-category", { detail: categoryName }));
    const el = document.getElementById("products");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/#products");
    }
  };

  return (
    <>
      <nav
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? "bg-background/70 backdrop-blur-xl shadow-sm border-border"
            : "bg-background/95 backdrop-blur-sm border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 w-full items-center justify-between px-4 md:px-8 lg:px-12">

          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="Urban Dhage"
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            <Link
              to="/"
              className="px-3 py-2 font-body text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Home
            </Link>

            {/* Categories dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <button className="flex items-center gap-1 px-3 py-2 font-body text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Shop{" "}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown */}
              <div
                className={`absolute left-0 top-full w-48 overflow-hidden rounded-xl border bg-popover shadow-lg transition-all duration-200 ${
                  dropdownOpen
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-2 opacity-0"
                }`}
              >
                <div className="p-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.name}
                      className="block w-full rounded-lg px-3 py-2 text-left font-body text-sm text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                      onClick={() => handleCategoryClick(cat.name)}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Expandable search */}
            <div className="relative flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(!searchOpen)}
                className="shrink-0"
              >
                <Search className="h-4 w-4" />
              </Button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  searchOpen ? "w-48" : "w-0"
                }`}
              >
                <input
                  ref={searchRef}
                  placeholder="Search products..."
                  className="h-8 w-full rounded-lg border bg-muted/50 px-3 font-body text-sm outline-none focus:ring-1 focus:ring-ring"
                  onBlur={() => setSearchOpen(false)}
                  onChange={(e) => {
                    // Dispatch search event — ProductGrid can listen to this
                    window.dispatchEvent(
                      new CustomEvent("search-products", { detail: e.target.value })
                    );
                  }}
                />
              </div>
            </div>

            {/* Cart */}
            <Link to="/cart" className="relative ml-1">
              <Button variant="ghost" size="icon">
                <ShoppingBag className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary font-body text-xs text-primary-foreground">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>

            {/* User */}
            {user ? (
              <div className="ml-1 flex items-center gap-2">
                <span className="max-w-[120px] truncate font-body text-xs text-muted-foreground">
                  {user.email}
                </span>
                <Link
                  to="/my-orders"
                  className="flex items-center gap-1 font-body text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Package className="h-3.5 w-3.5" />
                  My Orders
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm" className="ml-1 gap-1.5 font-body">
                  <User className="h-4 w-4" /> Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile right side */}
          <div className="flex items-center gap-2 md:hidden">
            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon">
                <ShoppingBag className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t bg-background px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="font-body text-sm font-medium text-muted-foreground"
              >
                Home
              </Link>

              <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Shop by Category
              </p>

              {CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => handleCategoryClick(cat.name)}
                  className="pl-2 text-left font-body text-sm font-medium text-muted-foreground"
                >
                  {cat.name}
                </button>
              ))}

              <div className="my-1 border-t border-border" />

              {user ? (
                <>
                  <Link
                    to="/my-orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-1.5 font-body text-sm font-medium text-muted-foreground"
                  >
                    <Package className="h-4 w-4" />
                    My Orders
                  </Link>
                  <div className="flex items-center justify-between">
                    <span className="truncate font-body text-sm text-muted-foreground">
                      {user.email}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="mr-1 h-4 w-4" /> Logout
                    </Button>
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-body text-sm font-medium text-primary"
                >
                  Login / Sign Up
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Marquee strip ─────────────────────────────────────────────────────── */}
      {/* Uses SVG diamond separators instead of ✦ emoji */}
      <div className="overflow-hidden border-b border-black/10 bg-[hsl(var(--silver))] py-2 text-[hsl(var(--silver-foreground))]">
        <div className="marquee-strip">
          {/* Duplicate the set 4× so the loop is seamless at any screen width */}
          {Array.from({ length: 4 }).map((_, groupIdx) => (
            <span key={groupIdx} className="flex shrink-0 items-center">
              {MARQUEE_ITEMS.map((item, itemIdx) => (
                <span
                  key={itemIdx}
                  className="flex shrink-0 items-center gap-4 px-4"
                >
                  <span className="font-body text-xs font-medium uppercase tracking-widest whitespace-nowrap">
                    {item}
                  </span>
                  <Diamond />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </>
  );
};

export default Navbar;
