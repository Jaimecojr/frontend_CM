"use client";

import { useEffect, useState } from "react";
import { MessageSquarePlus, Trash2, Loader2, StickyNote } from "lucide-react";
import {
  getAffiliateNotes,
  deleteAffiliateNote,
  type ApiAffiliateNote,
  type ApiAffiliate,
} from "../fetch";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { useAuth } from "@/context/AuthContext";
import { NoteModal } from "./NoteModal";

type Props = {
  affiliateId: number;
  affiliateName?: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AffiliateNotes({ affiliateId, affiliateName = "Afiliado" }: Props) {
  const { user } = useAuth();
  const isSuperAdmin = user?.type === 1;

  const [notes, setNotes] = useState<ApiAffiliateNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadNotes = () => {
    setLoading(true);
    getAffiliateNotes(affiliateId)
      .then(setNotes)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotes();
  }, [affiliateId]);

  const handleDelete = async (note: ApiAffiliateNote) => {
    try {
      const ok = await alert.confirm({
        title: "¿Eliminar nota?",
        text: "Esta acción no se puede deshacer.",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        onConfirm: () => deleteAffiliateNote(affiliateId, note.id),
      });
      if (ok) {
        setNotes((prev) => prev.filter((n) => n.id !== note.id));
      }
    } catch (err) {
      await alert.error("Error", getApiErrorMessage(err));
    }
  };

  return (
    <div className="mt-8 border-t border-stroke pt-6 dark:border-dark-3">
      {/* Encabezado de la sección */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-dark dark:text-white">
            Notas / Observaciones
          </h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {notes.length}
          </span>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Nueva nota
        </button>
      </div>

      {/* Lista de notas */}
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando notas...
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-neutral-400 dark:text-neutral-500">
          <StickyNote className="h-10 w-10 opacity-30" />
          <p className="text-sm">No hay notas registradas para este afiliado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark"
            >
              <p className="whitespace-pre-wrap text-sm text-dark dark:text-white">
                {note.body}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  <span className="font-medium text-neutral-600 dark:text-neutral-400">
                    {note.user?.name ?? "Sistema"}
                  </span>
                  {" · "}
                  {formatDate(note.created_at)}
                </span>
                {isSuperAdmin && (
                  <button
                    onClick={() => handleDelete(note)}
                    className="rounded p-1 text-neutral-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    title="Eliminar nota"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para nueva nota */}
      {modalOpen && (
        <NoteModal
          affiliateId={affiliateId}
          affiliateName={affiliateName}
          onClose={(saved) => {
            setModalOpen(false);
            if (saved) loadNotes(); // recargar notas si se guardó una
          }}
        />
      )}
    </div>
  );
}
