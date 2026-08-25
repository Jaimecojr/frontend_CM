"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getAuthUser, logout, csrf } from "@/app/4dnn1n/home/fetch";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  user: string;
  type: number;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isLoggingOut: boolean;
  refreshUser: () => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const router = useRouter();

  useEffect(() => {
    refreshUser();
  }, []);

  const refreshUser = async () => {
    try {
      const u = await getAuthUser();
      setUser(u);
    } catch {
      setUser(null);
    }
    setLoading(false);
  };

  const logoutUser = async () => {
    setIsLoggingOut(true);

    try {
      // 1️⃣ Obtener token CSRF antes del POST
      await csrf();

      // 2️⃣ Llamar a /logout
      await logout();
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      // 3️⃣ Borrar usuario local
      setUser(null);

      // 4️⃣ Redirección limpia (full reload para limpiar estados)
      window.location.href = "/auth/sign-in";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggingOut,
        refreshUser,
        logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}
