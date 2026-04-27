import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// ✅ Add your admin email here — only this email can access /admin
const ADMIN_EMAILS = ["support@urbandhage.in"];

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Not logged in at all → go to login
  if (!user) return <Navigate to="/admin/login" replace />;

  // Logged in but not an admin → kick back to homepage silently
  if (!ADMIN_EMAILS.includes(user.email || "")) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
