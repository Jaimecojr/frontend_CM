"use client";

import { useState, useRef } from "react";
import { Save, Eraser, ImagePlus } from "lucide-react";
import type { ApiSpecialist } from "../fetch";
import { Button } from "@/components/ui-elements/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  initial?: ApiSpecialist;
  onSubmit: (formData: FormData) => Promise<void>;
};

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </label>
  );
}

export default function SpecialistForm({ mode, initial, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [specialty, setSpecialty] = useState(initial?.specialty ?? "");
  const [position, setPosition] = useState(String(initial?.position ?? "1"));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(
    initial?.photo ? `${API_URL}/storage/${initial.photo}` : null,
  );
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPreviewSrc(URL.createObjectURL(file));
  };

  const clear = () => {
    setName("");
    setSpecialty("");
    setPosition("1");
    setPhotoFile(null);
    setPreviewSrc(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const canSubmit = (() => {
    if (!name) return false;
    if (!specialty) return false;
    if (mode === "create" && !photoFile) return false;
    if (!position || Number(position) < 1) return false;
    return true;
  })();

  const submit = async () => {
    if (!canSubmit) return;
    const fd = new FormData();
    if (photoFile) fd.append("photo", photoFile);
    fd.append("name", name);
    fd.append("specialty", specialty);
    fd.append("position", position);
    setSaving(true);
    try {
      await onSubmit(fd);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-background rounded-2xl border border-stroke p-5 shadow-sm dark:border-dark-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label required>Foto</Label>
          <div className="mt-2 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-stroke bg-gray-50 p-6 dark:border-dark-3 dark:bg-dark-2">
            {previewSrc ? (
              <img
                src={previewSrc}
                alt="Photo preview"
                className="h-36 w-36 rounded-full object-cover border border-stroke"
              />
            ) : (
              <ImagePlus className="h-12 w-12 text-gray-400" />
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-sm font-medium text-blue-500 hover:underline"
            >
              {previewSrc ? "Cambiar foto" : "Seleccionar foto"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label required>Nombre</Label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del especialista"
              className="mt-2 w-full rounded-lg border border-stroke bg-white px-4 py-2.5 outline-none focus:border-blue-500 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>

          <div>
            <Label required>Especialidad</Label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Ej: Cardiología"
              className="mt-2 w-full rounded-lg border border-stroke bg-white px-4 py-2.5 outline-none focus:border-blue-500 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>

          <div>
            <Label required>Posición</Label>
            <input
              type="number"
              min="1"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="mt-2 w-full rounded-lg border border-stroke bg-white px-4 py-2.5 outline-none focus:border-blue-500 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 font-medium text-dark hover:shadow-1 dark:border-dark-3 dark:text-white"
        >
          <Eraser className="h-4 w-4" />
          Limpiar
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={!canSubmit || saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-gray-2 hover:bg-opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
