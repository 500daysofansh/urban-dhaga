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
    // ── Step 1: Start the redirect-result check ───────────────────────────────
    // On mobile, after the user picks their Google account and is returned to
    // the app, Firebase needs getRedirectResult() to exchange the redirect
    // credential for a real user. This is async and takes a moment.
    //
    // THE BUG we're fixing: the old code ran getRedirectResult() and
    // onAuthStateChanged() in parallel. onAuthStateChanged fires almost
    // immediately with user=null (Firebase hasn't processed the redirect yet),
    // which set loading=false while the user was still null — making the app
    // think the user wasn't signed in and never navigating home.
    //
    // THE FIX: we track whether the redirect check has finished. We only call
    // setLoading(false) inside onAuthStateChanged once redirectPromise has
    // settled. This guarantees the app never sees a (loading=false, user=null)
    // flash right after a successful Google redirect.

    let redirectSettled = false;

    const redirectPromise = getRedirectResult(auth)
      .then((result) => {
        // result is null when there's no pending redirect (normal on desktop
        // or on any load that wasn't a return from Google sign-in).
        if (result?.user) {
          setUser(result.user);
        }
      })
      .catch((error) => {
        // Only log genuine errors — "auth/no-auth-event" just means there was
        // no redirect in progress, which is the normal case on desktop.
        if (error?.code && error.code !== "auth/no-auth-event") {
          console.error("Google redirect error:", error.code, error.message);
        }
      })
      .finally(() => {
        redirectSettled = true;
      });

    // ── Step 2: Subscribe to auth state changes ───────────────────────────────
    // onAuthStateChanged is the single source of truth for the current user.
    // It fires for email/password login, Google popup (desktop), AND after the
    // redirect credential has been processed (mobile).
    //
    // We gate setLoading(false) behind redirectPromise so that if the redirect
    // check is still in flight when this first fires, we wait for it to finish
    // before unlocking the app. On desktop (no redirect pending) redirectPromise
    // resolves in milliseconds with null, so there's no perceptible delay.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (redirectSettled) {
        // Redirect check already done — unlock immediately.
        setLoading(false);
      } else {
        // Redirect check still running — wait for it so we don't flash logged-out.
        redirectPromise.finally(() => setLoading(false));
      }
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
      // Redirect flow: navigates the browser away to Google's sign-in page,
      // then Google redirects back to the app. The result is picked up by
      // getRedirectResult() above on the next page load.
      // This call will not resolve/reject meaningfully on mobile because the
      // page navigates away — that's expected and correct.
      await signInWithRedirect(auth, googleProvider);
    } else {
      // Popup flow: opens a small window, resolves immediately with the user.
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
