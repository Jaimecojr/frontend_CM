"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquarePlus, Loader2, X } from "lucide-react";
import { createAffiliateNote } from "../fetch";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

type Props = {
  affiliateId: number;
  affiliateName: string;
  onClose: (saved?: boolean) => void;
};

export function NoteModal({ affiliateId, affiliateName, onClose }: Props) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Needed for the portal — only mounts on the client
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleSave = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await createAffiliateNote(affiliateId, trimmed);
      await alert.success("Nota guardada", "La nota fue registrada correctamente.");
      onClose(true);
    } catch (err) {
      await alert.error("Error", getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    // Backdrop — rendered into document.body via portal
    <div
      className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-dark">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-dark-3">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-dark dark:text-white">Nueva nota</h2>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">{affiliateName}</p>
            </div>
          </div>
          <button
            onClick={() => onClose()}
            className="rounded-lg p-1 text-neutral-400 transition hover:bg-neutral-100 dark:hover:bg-dark-3"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <textarea
            ref={textareaRef}
            autoFocus
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribe la observación, solicitud o novedad del afiliado..."
            rows={5}
            className="w-full resize-none rounded-lg border border-stroke bg-gray-50 px-3 py-2 text-sm text-dark outline-none placeholder:text-neutral-400 focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-stroke px-5 py-4 dark:border-dark-3">
          <button
            onClick={() => onClose()}
            className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:shadow-sm dark:border-dark-3 dark:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !body.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
            Guardar nota
          </button>
        </div>
      </div>
    </div>
  );

  // Render into document.body to avoid z-index issues with layout transforms
  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
