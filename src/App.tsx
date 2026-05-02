import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index.tsx";
import Cart from "./pages/Cart.tsx";
import UserLogin from "./pages/UserLogin.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminPanel from "./pages/AdminPanel.tsx";
import OrderConfirmation from "./pages/OrderConfirmation.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import NotFound from "./pages/NotFound.tsx";
import MyOrders from "./pages/MyOrders.tsx";
import SizeGuide from "./pages/SizeGuide.tsx";
import Returns from "./pages/Returns.tsx";
import ShippingInfo from "./pages/ShippingInfo.tsx";

const queryClient = new QueryClient();

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

function Analytics() {
  const location = useLocation();
  useEffect(() => {
    if (!window.gtag || !GA_ID) return;
    window.gtag("config", GA_ID, {
      page_path: location.pathname + location.search,
    });
  }, [location]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Analytics />
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/login" element={<UserLogin />} />
              <Route path="/order-confirmation" element={<OrderConfirmation />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/size-guide" element={<SizeGuide />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/shipping" element={<ShippingInfo />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
