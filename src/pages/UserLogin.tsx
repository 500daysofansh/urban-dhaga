import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
    <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

// User-agent based — matches AuthContext
const isMobileDevice = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// ── Shared class applied to every <Input> ─────────────────────────────────────
// iOS Safari auto-zooms when a focused input has font-size < 16px.
// `text-base` (16px) on mobile prevents the zoom; `sm:text-sm` (14px) restores
// the smaller visual size on wider screens where zoom isn't an issue.
const INPUT_CLS = "text-base sm:text-sm touch-manipulation";

const UserLogin = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const { login, signup, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      if (isMobileDevice()) {
        // Redirect flow — page navigates away, spinner stays visible
        return;
      }
      // Desktop popup resolves immediately
      toast({ title: "Welcome! 👋", description: "Signed in with Google." });
      navigate("/");
    } catch (error: any) {
      const code = error?.code || "";
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        toast({
          title: "Google sign-in failed",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
      setIsGoogleLoading(false);
    }
  };

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
        toast({ title: "Account created! 🎉", description: "Welcome to Urban Dhage." });
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

  // ── Password reset view ───────────────────────────────────────────────────

  if (showReset) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Urban <span className="text-primary">Dhage</span>
            </h1>
            <p className="mt-2 font-body text-sm text-muted-foreground">Reset your password</p>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                // iOS zoom fix: 16px on mobile, 14px on sm+
                className={`pl-10 font-body ${INPUT_CLS}`}
                required
              />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={isLoading}>
              {isLoading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                : "Send Reset Link"}
            </Button>
          </form>

          <button
            onClick={() => setShowReset(false)}
            className="mx-auto flex items-center gap-1 font-body text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to login
          </button>
        </div>
      </div>
    );
  }

  // ── Main login / signup view ──────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Urban <span className="text-primary">Dhage</span>
          </h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            {isSignup ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        {/* Google button */}
        <Button
          type="button"
          variant="outline"
          className="w-full gap-3 rounded-full font-body"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || isLoading}
        >
          {isGoogleLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isMobileDevice() ? "Redirecting to Google…" : "Signing in…"}
            </>
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-body text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Email / password form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`pl-10 font-body ${INPUT_CLS}`}
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`pl-10 pr-10 font-body ${INPUT_CLS}`}
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

          {/* Confirm password (signup only) */}
          {isSignup && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`pl-10 font-body ${INPUT_CLS}`}
                required
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full rounded-full font-body"
            disabled={isLoading || isGoogleLoading}
          >
            {isLoading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</>
              : isSignup ? "Create Account" : "Sign In"}
          </Button>
        </form>

        {/* Forgot password */}
        {!isSignup && (
          <button
            onClick={() => setShowReset(true)}
            className="mx-auto block font-body text-sm text-muted-foreground hover:text-primary"
          >
            Forgot password?
          </button>
        )}

        {/* Toggle sign in / sign up */}
        <div className="text-center font-body text-sm text-muted-foreground">
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
          className="mx-auto flex items-center justify-center gap-1 font-body text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to store
        </Link>

      </div>
    </div>
  );
};

export default UserLogin;
