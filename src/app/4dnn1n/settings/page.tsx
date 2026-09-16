"use client";

import { useEffect, useState } from "react";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { usePageTitle } from "@/hooks/usePageTitle";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { useAuth } from "@/context/AuthContext";

import { getSetting, updateSetting, type ApiSetting } from "./fetch";
import SettingForm from "./_components/SettingForm";

export default function SettingsPage() {
  usePageTitle("Configuración");
  const { user: authUser, loading: authLoading } = useAuth();

  const [setting, setSetting] = useState<ApiSetting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authUser?.type !== 1) return;

    (async () => {
      try {
        const data = await getSetting();
        setSetting(data);
      } catch (err) {
        await alert.error("Error", getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [authUser]);

  const handleSubmit = async (payload: Omit<ApiSetting, "id">) => {
    if (!setting) return;
    try {
      const res = await updateSetting(setting.id, payload);
      setSetting(res.data);
      await alert.success("Guardado", "Configuración actualizada exitosamente.");
    } catch (err) {
      await alert.error("Error", getApiErrorMessage(err));
    }
  };

  if (authLoading) return null;
  if (authUser?.type !== 1) {
    return (
      <div className="flex h-64 items-center justify-center p-6 text-red-500 font-medium">
        No tienes permisos suficientes para acceder a esta vista.
      </div>
    );
  }

  return (
    <>
      <LoadingOverlay isLoading={loading} />

      {!loading && setting && (
        <ShowcaseSection
          title="Configuración Global"
          description="Parámetros de integración con la API de WhatsApp Business."
        >
          <SettingForm initial={setting} onSubmit={handleSubmit} />
        </ShowcaseSection>
      )}
    </>
  );
}
