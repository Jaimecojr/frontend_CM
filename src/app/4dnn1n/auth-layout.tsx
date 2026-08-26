"use client";

import { Sidebar } from "@/components/Layouts/sidebar";
import { Header } from "@/components/Layouts/header";
import { Providers } from "./providers";
import NextTopLoader from "nextjs-toploader";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { LoadingOverlay } from "@/components/LoadingOverlay";

export default function AuthLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, loading, isLoggingOut } = useRequireAuth();

  if (isLoggingOut) return <LoadingOverlay />;

  if (loading) return <LoadingOverlay />;

  if (!user) return null;

  return (
    <Providers>
      <NextTopLoader color="#5750F1" showSpinner={false} />

      <div className="flex min-h-screen">
        <Sidebar />

        {/* KEY: flex-1 + min-w-0 + flex-col */}
        <div className="flex min-w-0 flex-1 flex-col bg-gray-2 dark:bg-[#020d1a]">
          <Header />

          <main className="isolate mx-auto w-full max-w-screen-2xl overflow-x-auto p-4 md:p-6 2xl:p-10">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
