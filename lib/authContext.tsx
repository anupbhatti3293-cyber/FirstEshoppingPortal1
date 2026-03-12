'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

interface AuthUser {
  id?: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  wishlistCount: number;
  setWishlistCount: (n: number) => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [wishlistCount, setWishlistCount] = useState(0);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const { data } = await res.json();
        setUser({
          id: String(data.id),
          email: data.email,
          firstName: data.first_name,
          lastName: data.last_name,
          phone: data.phone,
        });
        // Fetch wishlist count
        const wRes = await fetch('/api/wishlist');
        if (wRes.ok) {
          const wData = await wRes.json();
          setWishlistCount(wData.data?.length ?? 0);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (json.success) {
      await refreshUser();
      return { success: true };
    }
    return { success: false, error: json.error };
  };

  const register = async (data: RegisterData) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      await refreshUser();
      return { success: true };
    }
    return { success: false, error: json.error };
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setWishlistCount(0);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, wishlistCount, setWishlistCount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
