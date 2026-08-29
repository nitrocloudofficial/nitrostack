'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

export type UserRole = 'hospital' | 'patient' | 'insurer' | 'guest';

export type UserProfile = {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  organization: string;
  idNumber: string;
  title: string;
};

export const MOCK_USERS: Record<Exclude<UserRole, 'guest'>, UserProfile> = {
  hospital: {
    id: 'usr-hosp-101',
    name: 'Dr. Rajesh Sharma',
    role: 'hospital',
    email: 'rajesh.sharma@sunrisehospital.com',
    organization: 'Sunrise General Hospital',
    idNumber: 'EMP-HOSP-882',
    title: 'Chief Medical Officer / Admin',
  },
  patient: {
    id: 'usr-pat-202',
    name: 'Meera Nair',
    role: 'patient',
    email: 'meera.nair@example.com',
    organization: 'Self (Policyholder)',
    idNumber: 'POL-STAR-44912',
    title: 'Insured Patient',
  },
  insurer: {
    id: 'usr-ins-303',
    name: 'Vikram Sethi',
    role: 'insurer',
    email: 'vikram.sethi@starhealth.com',
    organization: 'Star Health Insurance',
    idNumber: 'AGT-LIC-9904',
    title: 'Senior Claims Adjudicator',
  },
};

const AUTH_STORAGE_KEY = 'care-mediator:active-user-v2';

type AuthContextValue = {
  user: UserProfile | null;
  loginAsRole: (role: Exclude<UserRole, 'guest'>) => void;
  loginCustom: (profile: UserProfile) => void;
  logout: () => void;
  isAuthenticated: boolean;
  canAccessRole: (targetRole: UserRole) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Always start logged-out so the very first client render matches the
  // server-rendered HTML exactly — reading localStorage here (even guarded
  // by typeof window) causes a hydration mismatch on every page where a
  // session is already stored, since SSR can never see it but the client's
  // first render otherwise would.
  const [user, setUser] = useState<UserProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore a stored session once we're safely past hydration. Deferred
  // through a microtask (rather than calling setState synchronously at the
  // top of the effect) per this repo's established pattern for satisfying
  // react-hooks/set-state-in-effect.
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) setUser(JSON.parse(stored));
      } catch {
        // ignore corrupt stored value
      } finally {
        setHydrated(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return; // don't clobber storage before we've read it
    if (user) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user, hydrated]);

  const loginAsRole = useCallback((role: Exclude<UserRole, 'guest'>) => {
    setUser(MOCK_USERS[role]);
  }, []);

  const loginCustom = useCallback((profile: UserProfile) => {
    setUser(profile);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const canAccessRole = useCallback(
    (targetRole: UserRole) => {
      if (!user) return false;
      return user.role === targetRole;
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      loginAsRole,
      loginCustom,
      logout,
      isAuthenticated: Boolean(user),
      canAccessRole,
    }),
    [user, loginAsRole, loginCustom, logout, canAccessRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
