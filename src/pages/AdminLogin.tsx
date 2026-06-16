import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Loader2 } from "lucide-react";

// Must match the list in ProtectedRoute.tsx
const ADMIN_EMAILS = ["support@urbandhage.in",
                     "urbandhagee@gmail.com"];

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Block non-admin emails before even hitting Firebase
    if (!ADMIN_EMAILS.includes(email.toLowerCase().trim())) {
      toast({
        title: "Access denied",
        description: "This email is not authorised for admin access.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      toast({ title: "Welcome back!" });
      navigate("/admin");
    } catch {
      toast({
        title: "Login failed",
        description: "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <div className="rounded-xl bg-primary/10 p-3">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Urban <span className="text-primary">Dhage</span>
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">Admin access only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : "Sign In"}
          </Button>
        </form>

        <p className="text-center font-body text-xs text-muted-foreground">
          Not an admin?{" "}
          <a href="/" className="text-primary underline underline-offset-2">Go to store</a>
        </p>

      </div>
    </div>
  );
};

export default AdminLogin;
