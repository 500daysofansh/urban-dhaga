import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";

const UserLogin = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const { login, signup, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignup && password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      if (isSignup) {
        await signup(email, password);
        toast({ title: "Account created! 🎉", description: "Welcome to Urban Dhaga." });
      } else {
        await login(email, password);
        toast({ title: "Welcome back! 👋" });
      }
      navigate("/");
    } catch (error: any) {
      const code = error?.code || "";
      let message = "Something went wrong. Please try again.";
      if (code === "auth/email-already-in-use") message = "This email is already registered. Try signing in.";
      else if (code === "auth/invalid-credential" || code === "auth/wrong-password") message = "Invalid email or password.";
      else if (code === "auth/user-not-found") message = "No account found with this email.";
      else if (code === "auth/too-many-requests") message = "Too many attempts. Please try again later.";
      toast({ title: isSignup ? "Signup failed" : "Login failed", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Enter your email address", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword(email);
      toast({ title: "Reset email sent! 📧", description: "Check your inbox for a password reset link." });
      setShowReset(false);
    } catch {
      toast({ title: "Failed to send reset email", description: "Make sure the email is correct.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (showReset) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Urban <span className="text-primary">Dhaga</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Reset your password</p>
          </div>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
          <button
            onClick={() => setShowReset(false)}
            className="mx-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Urban <span className="text-primary">Dhaga</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignup ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {isSignup && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Please wait..." : isSignup ? "Create Account" : "Sign In"}
          </Button>
        </form>

        {!isSignup && (
          <button
            onClick={() => setShowReset(true)}
            className="mx-auto block text-sm text-muted-foreground hover:text-primary"
          >
            Forgot password?
          </button>
        )}

        <div className="text-center text-sm text-muted-foreground">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => { setIsSignup(!isSignup); setConfirmPassword(""); }}
            className="font-medium text-primary hover:underline"
          >
            {isSignup ? "Sign In" : "Sign Up"}
          </button>
        </div>

        <Link
          to="/"
          className="mx-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to store
        </Link>
      </div>
    </div>
  );
};

export default UserLogin;
