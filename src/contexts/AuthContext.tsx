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
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // onAuthStateChanged is the single source of truth.
    // We no longer use signInWithRedirect, so there is no pending redirect
    // result to race against — loading can be set false as soon as Firebase
    // resolves the initial auth state check.
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
    // We use signInWithPopup on ALL platforms — desktop and mobile.
    //
    // Why we dropped signInWithRedirect:
    //   The redirect flow requires authDomain to match the app's origin so
    //   Firebase can postMessage the credential back across the redirect.
    //   When authDomain was set to the default <project>.firebaseapp.com,
    //   Firebase redirected back to that domain, then tried to postMessage
    //   the credential to [www.urbandhage.in](https://www.urbandhage.in) — a different origin. The browser
    //   blocked this cross-origin postMessage, so getRedirectResult() always
    //   returned null and no account was created.
    //
    //   signInWithPopup is simpler, works on all modern mobile browsers
    //   (iOS Safari 14+, Chrome Android), and has no cross-origin issue at all.
    //   The popup opens Google, the user picks their account, the popup closes,
    //   and the Promise resolves with the credential — done.
    //
    //   The only scenario where popups are blocked on mobile is when the call
    //   doesn't originate directly from a user gesture (a tap). Our button's
    //   onClick → handleGoogleLogin → loginWithGoogle chain IS a direct user
    //   gesture, so the popup is always allowed.
    await signInWithPopup(auth, googleProvider);
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
