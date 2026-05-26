"use client";

import { useState, useRef } from "react";
import { Save, Eraser, ImagePlus } from "lucide-react";
import type { ApiAlly } from "../fetch";
import { Button } from "@/components/ui-elements/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  initial?: ApiAlly;
  onSubmit: (formData: FormData) => Promise<void>;
};

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </label>
  );
}

export default function AllyForm({ mode, initial, onSubmit }: Props) {
  const [url, setUrl] = useState(initial?.url ?? "");
  const [position, setPosition] = useState(String(initial?.position ?? "1"));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(
    initial?.image ? `${API_URL}/storage/${initial.image}` : null,
  );
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreviewSrc(URL.createObjectURL(file));
  };

  const clear = () => {
    setUrl("");
    setPosition("1");
    setImageFile(null);
    setPreviewSrc(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const canSubmit = (() => {
    if (!url) return false;
    if (mode === "create" && !imageFile) return false;
    if (!position || Number(position) < 1) return false;
    return true;
  })();

  const submit = async () => {
    if (!canSubmit) return;
    const fd = new FormData();
    if (imageFile) fd.append("image", imageFile);
    fd.append("url", url);
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

        <div className="md:col-span-2">
          <Label required={mode === "create"}>
            {mode === "create" ? "Imagen del banner" : "Imagen del banner (dejar vacío para conservar la actual)"}
          </Label>
          <div
            className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stroke p-6 hover:border-primary dark:border-dark-3"
            onClick={() => inputRef.current?.click()}
          >
            {previewSrc ? (
              <img
                src={previewSrc}
                alt="Preview"
                className="max-h-40 rounded-md object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-dark-5">
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm">Haz clic para seleccionar imagen</span>
                <span className="text-xs">JPEG, PNG o WebP — máx. 2MB</span>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <Label required>URL del aliado</Label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://empresa.com"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <Label required>Posición</Label>
          <input
            value={position}
            onChange={(e) => setPosition(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="1"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          onClick={clear}
          disabled={saving}
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
