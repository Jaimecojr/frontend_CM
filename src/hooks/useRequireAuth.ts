"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Redirects to `/auth/sign-in` when there's no authenticated user.
 *
 * Waits for `loading` to resolve before deciding — while the initial auth check is
 * still running, `user` is momentarily `null` even for an already-authenticated
 * session, and redirecting during that window would kick out a valid user.
 *
 * Excludes `isLoggingOut`: right after logout, `user` briefly becomes `null` before
 * the logout flow's own navigation runs, and redirecting here would race with it.
 */
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
