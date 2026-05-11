import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type {
  User,
  Auth,
} from "firebase/auth";
import { getAuthInstance } from "@/lib/firebase";

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};

    // Auth is loaded lazily — only kicks off firebase/auth download here,
    // not at module load time. This removes auth/iframe.js from critical path.
    getAuthInstance().then((auth: Auth) => {
      import("firebase/auth").then(({ onAuthStateChanged }) => {
        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          setUser(firebaseUser);
          setLoading(false);
        });
      });
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const auth = await getAuthInstance();
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string) => {
    const auth = await getAuthInstance();
    const { createUserWithEmailAndPassword } = await import("firebase/auth");
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const auth = await getAuthInstance();
    const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
    const googleProvider = new GoogleAuthProvider();
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    const auth = await getAuthInstance();
    const { signOut } = await import("firebase/auth");
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    const auth = await getAuthInstance();
    const { sendPasswordResetEmail } = await import("firebase/auth");
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
