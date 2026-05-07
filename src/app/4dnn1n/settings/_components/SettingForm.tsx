"use client";

import { useMemo, useState } from "react";
import { Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui-elements/button";
import type { ApiSetting } from "../fetch";

type Props = {
  initial: ApiSetting;
  onSubmit: (payload: Omit<ApiSetting, "id">) => Promise<void>;
};

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </label>
  );
}

export default function SettingForm({ initial, onSubmit }: Props) {
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [form, setForm] = useState({
    wa_api_version: initial.wa_api_version ?? "",
    wa_phone_number_id: initial.wa_phone_number_id ?? "",
    wa_bearer_token: initial.wa_bearer_token ?? "",
    wa_template_name: initial.wa_template_name ?? "",
  });

  const canSubmit = useMemo(
    () =>
      form.wa_api_version.trim() !== "" &&
      form.wa_phone_number_id.trim() !== "" &&
      form.wa_bearer_token.trim() !== "" &&
      form.wa_template_name.trim() !== "",
    [form],
  );

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-background rounded-2xl border border-stroke p-5 shadow-sm dark:border-dark-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label required>Versión API WhatsApp</Label>
          <input
            value={form.wa_api_version}
            onChange={(e) =>
              setForm((p) => ({ ...p, wa_api_version: e.target.value }))
            }
            placeholder="Ej: v18.0"
            className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark-2"
          />
        </div>

        <div>
          <Label required>ID Número de Teléfono</Label>
          <input
            value={form.wa_phone_number_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, wa_phone_number_id: e.target.value }))
            }
            placeholder="Ej: 123456789"
            className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark-2"
          />
        </div>

        <div className="md:col-span-2">
          <Label required>Bearer Token</Label>
          <div className="relative mt-1">
            <input
              type={showToken ? "text" : "password"}
              value={form.wa_bearer_token}
              onChange={(e) =>
                setForm((p) => ({ ...p, wa_bearer_token: e.target.value }))
              }
              placeholder="Token de acceso de la API"
              className="w-full rounded-lg border border-stroke px-3 py-2 pr-10 dark:border-dark-3 dark:bg-dark-2"
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              tabIndex={-1}
            >
              {showToken ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <Label required>Nombre del Template</Label>
          <input
            value={form.wa_template_name}
            onChange={(e) =>
              setForm((p) => ({ ...p, wa_template_name: e.target.value }))
            }
            placeholder="Ej: saludo_bienvenida"
            className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark-2"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-gray-2 hover:bg-opacity-90 disabled:opacity-50"
          disabled={!canSubmit || saving}
        >
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
