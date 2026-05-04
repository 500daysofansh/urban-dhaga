import { Link, useLocation } from "react-router-dom";
import { Home, Search, Heart, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";

const MobileBottomNav = () => {
  const location = useLocation();
  const { totalItems: cartTotal } = useCart();
  const { totalItems: wishlistTotal } = useWishlist();

  const tabs = [
    { icon: Home,       label: "Home",     href: "/" },
    { icon: Search,     label: "Search",   href: "/#products" },
    { icon: Heart,      label: "Wishlist", href: "/wishlist", badge: wishlistTotal },
    { icon: ShoppingBag, label: "Cart",   href: "/cart",     badge: cartTotal },
    { icon: User,       label: "Account",  href: "/login" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md md:hidden">
      <div className="flex h-16 items-center justify-around">
        {tabs.map((tab) => {
          const active =
            tab.href === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(tab.href.split("#")[0]) && tab.href !== "/";

          return (
            <Link
              key={tab.label}
              to={tab.href}
              className={`relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 font-body text-xs transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className={`h-5 w-5 ${tab.label === "Wishlist" && active ? "fill-primary" : ""}`} />
              <span>{tab.label}</span>
              {tab.badge != null && tab.badge > 0 && (
                <span className="absolute -right-1 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary font-body text-[10px] text-primary-foreground">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
