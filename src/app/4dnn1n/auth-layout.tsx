"use client";

import { Sidebar } from "@/components/Layouts/sidebar";
import { Header } from "@/components/Layouts/header";
import { Providers } from "./providers";
import NextTopLoader from "nextjs-toploader";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { LoadingOverlay } from "@/components/LoadingOverlay";

export default function AuthLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, loading, isLoggingOut } = useRequireAuth();

  // 🔥 si está cerrando sesión → overlay global
  if (isLoggingOut) {
    return <LoadingOverlay message="Cerrando sesión..." />;
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-xl font-semibold">
        Validando sesión...
      </div>
    );
  }

  if (!user) {
    return null; // useRequireAuth hace redirect
  }

  return (
    <Providers>
      <NextTopLoader color="#5750F1" showSpinner={false} />
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="w-full bg-gray-2 dark:bg-[#020d1a]">
          <Header />
          <main className="isolate mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
