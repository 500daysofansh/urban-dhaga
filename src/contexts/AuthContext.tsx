import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

// Detect mobile/tablet by user-agent — this is the right signal because the
// issue is popup-blocking behavior, not screen size. Popup works fine on
// desktop Chrome/Firefox/Safari but is blocked on iOS Safari and most Android
// browsers regardless of viewport width.
const isMobileDevice = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ── Step 1: Check for a pending redirect result ──────────────────────────
    // When the user returns from Google sign-in on mobile, getRedirectResult
    // resolves with the credential. We must await it BEFORE setting loading:false
    // so the app doesn't flash the login page while the result is processing.
    getRedirectResult(auth)
      .then((result) => {
        // result is null if there's no pending redirect (normal on desktop)
        if (result?.user) {
          setUser(result.user);
        }
      })
      .catch((error) => {
        // Only log real errors — not the absence of a redirect
        if (error?.code && error.code !== "auth/no-auth-event") {
          console.error("Google redirect error:", error.code, error.message);
        }
      });

    // ── Step 2: Subscribe to auth state changes ───────────────────────────────
    // This fires for email/password login, Google popup, AND after redirect
    // resolves. It's the single source of truth for the current user.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    if (isMobileDevice()) {
      // Redirect flow: navigates away to Google, then returns to the app.
      // The result is picked up by getRedirectResult() above on next load.
      // This function will not resolve/reject in a meaningful way on mobile
      // because the page navigates away — that's expected.
      await signInWithRedirect(auth, googleProvider);
    } else {
      // Popup flow: resolves immediately with the user on desktop.
      await signInWithPopup(auth, googleProvider);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, loginWithGoogle, logout, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
