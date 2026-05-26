"use client";

import Link from "next/link";
import { Handshake, Stethoscope } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ContentPage() {
  usePageTitle("Administración de Contenido");
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.type !== 1) {
      router.replace("/4dnn1n/home");
    }
  }, [user, router]);

  if (!user || user.type !== 1) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Administración de Contenido
        </h1>
        <p className="mt-1 text-sm text-dark-5 dark:text-dark-6">
          Gestiona el contenido visible en la página web pública.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Link
          href="/4dnn1n/content/allies"
          className="flex flex-col gap-4 rounded-2xl border border-stroke bg-white p-6 shadow-sm transition hover:shadow-md dark:border-dark-3 dark:bg-gray-dark"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Handshake className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-dark dark:text-white">
              Aliados Estratégicos
            </h2>
            <p className="mt-1 text-sm text-dark-5 dark:text-dark-6">
              Banners de empresas aliadas que aparecen en la página web. Máximo 6.
            </p>
          </div>
          <span className="mt-auto inline-flex items-center text-sm font-medium text-primary">
            Gestionar →
          </span>
        </Link>

        <Link
          href="/4dnn1n/content/specialists"
          className="flex flex-col gap-4 rounded-2xl border border-stroke bg-white p-6 shadow-sm transition hover:shadow-md dark:border-dark-3 dark:bg-gray-dark"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Stethoscope className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-dark dark:text-white">
              Especialistas de la Salud
            </h2>
            <p className="mt-1 text-sm text-dark-5 dark:text-dark-6">
              Médicos destacados en el cuadro médico del homepage. Máximo 4.
            </p>
          </div>
          <span className="mt-auto inline-flex items-center text-sm font-medium text-primary">
            Gestionar →
          </span>
        </Link>
      </div>
    </div>
  );
}
