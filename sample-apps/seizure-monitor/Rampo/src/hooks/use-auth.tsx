import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (cifNo: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS: Record<string, { full_name: string; email: string }> = {
  "30014782291": { full_name: "MR. RAMESH KUMAR SHARMA", email: "cif_30014782291@rampo.internal" },
  "30014782292": { full_name: "MRS. SUNITA PATEL", email: "cif_30014782292@rampo.internal" },
  "30014782293": { full_name: "MR. ARJUN MENON", email: "cif_30014782293@rampo.internal" },
  "30014782294": { full_name: "MS. PRIYA ANANYA SHARMA", email: "cif_30014782294@rampo.internal" },
};

export async function checkAuthSession(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return true;
  } catch { /* ignore */ }

  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("rampo_demo_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.id || parsed.email)) return true;
      } catch {
        localStorage.removeItem("rampo_demo_user");
      }
    }
  }

  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
      } else {
        // Fallback: check stored demo user
        const stored = typeof window !== "undefined" ? localStorage.getItem("rampo_demo_user") : null;
        if (stored) {
          try {
            const parsedUser = JSON.parse(stored);
            setUser(parsedUser);
            setSession({ user: parsedUser } as Session);
          } catch {
            localStorage.removeItem("rampo_demo_user");
          }
        }
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // 2. Listen to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setSession(session);
          setUser(session.user);
          localStorage.removeItem("rampo_demo_user");
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (cifNo: string, password: string) => {
    const cleanCif = cifNo.trim();
    const email = `cif_${cleanCif}@rampo.internal`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.session) {
        setSession(data.session);
        setUser(data.user);
        localStorage.removeItem("rampo_demo_user");
        return { error: null };
      }
    } catch {
      // Catch network or 500 error from Supabase
    }

    // Fallback authentication for demo accounts
    const demoInfo = DEMO_USERS[cleanCif];
    if (demoInfo) {
      const mockUser = {
        id: `demo_${cleanCif}`,
        email: demoInfo.email,
        user_metadata: {
          cif_number: cleanCif,
          full_name: demoInfo.full_name,
        },
        aud: "authenticated",
        role: "authenticated",
        created_at: new Date().toISOString(),
      } as unknown as User;

      const mockSession = {
        user: mockUser,
        access_token: "demo_token",
        refresh_token: "demo_refresh_token",
        token_type: "bearer",
        expires_in: 3600,
      } as unknown as Session;

      setSession(mockSession);
      setUser(mockUser);
      if (typeof window !== "undefined") {
        localStorage.setItem("rampo_demo_user", JSON.stringify(mockUser));
      }
      return { error: null };
    }

    return { error: new Error("Invalid credentials. Please verify your CIF No and Password.") };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch { /* ignore */ }
    if (typeof window !== "undefined") {
      localStorage.removeItem("rampo_demo_user");
    }
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
