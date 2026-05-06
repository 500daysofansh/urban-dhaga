import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Menu, X, User, LogOut, Search, ChevronDown, Package, Heart, Settings } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
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

const Diamond = () => (
  <svg viewBox="0 0 10 10" width="7" height="7" className="inline-block shrink-0" aria-hidden="true">
    <polygon points="5,0.5 9.5,5 5,9.5 0.5,5" fill="currentColor" opacity="0.6" />
  </svg>
);

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
  const { totalItems: wishlistTotal } = useWishlist();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
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

  const displayLabel = user?.displayName
    ? user.displayName
    : user?.email?.split("@")[0] ?? "";

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
            <img src="/logo.png" alt="Urban Dhage" className="h-10 w-auto object-contain" />
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

            {/* Search */}
            <div className="relative flex items-center">
              <Button variant="ghost" size="icon" onClick={() => setSearchOpen(!searchOpen)} className="shrink-0">
                <Search className="h-4 w-4" />
              </Button>
              <div className={`overflow-hidden transition-all duration-300 ${searchOpen ? "w-48" : "w-0"}`}>
                <input
                  ref={searchRef}
                  placeholder="Search products..."
                  className="h-8 w-full rounded-lg border bg-muted/50 px-3 font-body text-base sm:text-sm outline-none focus:ring-1 focus:ring-ring touch-manipulation"
                  onBlur={() => setSearchOpen(false)}
                  onChange={(e) => {
                    window.dispatchEvent(new CustomEvent("search-products", { detail: e.target.value }));
                  }}
                />
              </div>
            </div>

            {/* Wishlist icon */}
            <Link to="/wishlist" className="group relative ml-1">
              <Button variant="ghost" size="icon">
                <Heart className="h-5 w-5 text-foreground transition-all duration-150 group-hover:fill-white group-hover:text-white" />
                {wishlistTotal > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary font-body text-xs text-primary-foreground">
                    {wishlistTotal > 9 ? "9+" : wishlistTotal}
                  </span>
                )}
              </Button>
            </Link>

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

            {/* User menu */}
            {user ? (
              <div className="relative ml-1" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((p) => !p)}
                  className="flex items-center gap-2 rounded-full border border-border bg-muted/40 py-1 pl-1 pr-3 transition-colors hover:bg-muted"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <span className="max-w-[100px] truncate font-body text-xs font-medium text-foreground">
                    {displayLabel}
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-border bg-popover shadow-lg transition-all duration-200 ${
                    userMenuOpen
                      ? "pointer-events-auto translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-2 opacity-0"
                  }`}
                >
                  <div className="border-b border-border px-4 py-3">
                    <p className="truncate font-body text-xs font-semibold text-foreground">{displayLabel}</p>
                    <p className="truncate font-body text-[11px] text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="p-1.5">
                    <Link
                      to="/my-orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 font-body text-sm text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                    >
                      <Package className="h-4 w-4" /> My Orders
                    </Link>
                    <Link
                      to="/account"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 font-body text-sm text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                    >
                      <Settings className="h-4 w-4" /> Account Settings
                    </Link>
                  </div>
                  <div className="border-t border-border p-1.5">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-body text-sm text-destructive transition-colors hover:bg-destructive/5"
                    >
                      <LogOut className="h-4 w-4" /> Log out
                    </button>
                  </div>
                </div>
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
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t bg-background px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="font-body text-sm font-medium text-muted-foreground">
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
              <Link
                to="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-1.5 font-body text-sm font-medium text-muted-foreground"
              >
                <Heart className="h-4 w-4" />
                Wishlist
                {wishlistTotal > 0 && (
                  <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 font-body text-[10px] text-primary-foreground">
                    {wishlistTotal}
                  </span>
                )}
              </Link>
              {user ? (
                <>
                  <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-body text-sm font-semibold text-foreground">{displayLabel}</p>
                      <p className="truncate font-body text-[11px] text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    to="/my-orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-1.5 font-body text-sm font-medium text-muted-foreground"
                  >
                    <Package className="h-4 w-4" /> My Orders
                  </Link>
                  <Link
                    to="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-1.5 font-body text-sm font-medium text-muted-foreground"
                  >
                    <Settings className="h-4 w-4" /> Account Settings
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-1.5 font-body text-sm font-medium text-destructive"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
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

      {/* Marquee strip */}
      <div className="overflow-hidden border-b border-black/10 bg-[hsl(var(--silver))] py-2 text-[hsl(var(--silver-foreground))]">
        <div className="marquee-strip">
          {Array.from({ length: 4 }).map((_, groupIdx) => (
            <span key={groupIdx} className="flex shrink-0 items-center">
              {MARQUEE_ITEMS.map((item, itemIdx) => (
                <span key={itemIdx} className="flex shrink-0 items-center gap-4 px-4">
                  <span className="whitespace-nowrap font-body text-xs font-medium uppercase tracking-widest">
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
