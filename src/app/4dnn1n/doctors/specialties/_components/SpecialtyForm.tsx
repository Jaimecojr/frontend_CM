"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { ApiSpecialty } from "../fetch";
import { Input } from "@/components/ui-elements/input";
import { Button } from "@/components/ui-elements/button";
import { alert } from "@/lib/alert";

type Props = {
  initial?: ApiSpecialty;
  onSubmit: (data: Partial<ApiSpecialty>) => Promise<void>;
  loading?: boolean;
};

export default function SpecialtyForm({ initial, onSubmit, loading }: Props) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    state: initial ? initial.state : 1,
  });

  const isBusy = loading;

  const canSubmit = form.name.trim().length > 0;

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      await alert.warn("Faltan datos", "El nombre de la especialidad es obligatorio.");
      return;
    }

    const payload: Partial<ApiSpecialty> = {
      name: form.name.trim(),
      state: Number(form.state),
    };
    
    await onSubmit(payload);
  };

  return (
    <form onSubmit={onFormSubmit} className="space-y-6">
      <div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-dark dark:text-white">
            Nombre de Especialidad <span className="text-red-500">*</span>
          </label>
          <Input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ej: Cardiología"
            disabled={isBusy}
          />
        </div>


      </div>

      <div className="flex justify-end border-t border-stroke pt-4 dark:border-dark-3">
        <Button
          type="submit"
          disabled={isBusy || !canSubmit}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
        >
          {isBusy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          {initial ? "Guardar Cambios" : "Crear Especialidad"}
        </Button>
      </div>
    </form>
  );
}
