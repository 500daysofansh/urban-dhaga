import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Menu, X, User, LogOut, Search, ChevronDown } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";

const CATEGORIES = [
  { name: "Sarees", href: "/#products" },
  { name: "Kurtas", href: "/#products" },
  { name: "Dupattas", href: "/#products" },
  { name: "Accessories", href: "/#products" },
  { name: "New Arrivals", href: "/#products" },
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
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
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
            <Link to="/" className="px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground font-body">
              Home
            </Link>

            {/* Categories dropdown */}
            <div className="relative" onMouseEnter={() => setDropdownOpen(true)} onMouseLeave={() => setDropdownOpen(false)}>
              <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground font-body">
                Shop <ChevronDown className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute left-0 top-full w-48 rounded-lg border bg-popover p-2 shadow-lg">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.name}
                      className="block w-full text-left rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground font-body"
                      onClick={() => handleCategoryClick(cat.name)}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Expandable search */}
            <div className="relative flex items-center">
              <Button variant="ghost" size="icon" onClick={() => setSearchOpen(!searchOpen)} className="shrink-0">
                <Search className="h-4 w-4" />
              </Button>
              <div className={`overflow-hidden transition-all duration-300 ${searchOpen ? "w-48" : "w-0"}`}>
                <input
                  ref={searchRef}
                  placeholder="Search..."
                  className="h-8 w-full rounded-md border bg-muted/50 px-3 text-sm outline-none focus:ring-1 focus:ring-ring font-body"
                  onBlur={() => setSearchOpen(false)}
                />
              </div>
            </div>

            <Link to="/cart" className="relative ml-1">
              <Button variant="ghost" size="icon">
                <ShoppingBag className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-body">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>
            {user ? (
              <div className="flex items-center gap-2 ml-1">
                <span className="text-xs text-muted-foreground truncate max-w-[120px] font-body">
                  {user.email}
                </span>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm" className="gap-1.5 ml-1 font-body">
                  <User className="h-4 w-4" /> Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile */}
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

        {mobileMenuOpen && (
          <div className="border-t bg-background px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-muted-foreground font-body">
                Home
              </Link>
              {CATEGORIES.map((cat) => (
                <button key={cat.name} onClick={() => handleCategoryClick(cat.name)} className="text-left text-sm font-medium text-muted-foreground font-body pl-2">
                  {cat.name}
                </button>
              ))}
              {user ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground truncate font-body">{user.email}</span>
                  <Button variant="ghost" size="sm" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                    <LogOut className="mr-1 h-4 w-4" /> Logout
                  </Button>
                </div>
              ) : (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-primary font-body">
                  Login / Sign Up
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Marquee strip — silver */}
      <div className="bg-[hsl(var(--silver))] text-[hsl(var(--silver-foreground))] overflow-hidden py-2 border-b border-black/10">
        <div className="marquee-strip">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="mx-8 text-xs font-medium tracking-widest uppercase font-body whitespace-nowrap">
              Handcrafted ✦ Sustainable ✦ Indian ✦ Free Shipping Above ₹999 ✦ 200+ Artisans ✦
            </span>
          ))}
        </div>
      </div>
    </>
  );
};

export default Navbar;
