"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function useRequireAuth() {
  const router = useRouter();
  const { user, loading, isLoggingOut } = useAuth();

  useEffect(() => {
    if (!loading && !user && !isLoggingOut) {
      router.replace("/auth/sign-in");
    }
  }, [loading, user, isLoggingOut, router]);

  return { user, loading, isLoggingOut };
}
