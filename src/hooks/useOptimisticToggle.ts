"use client";

import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import type { Dispatch, SetStateAction } from "react";

type TableMeta = { current_page: number; last_page: number; per_page: number; total: number };

type Options<T extends { id: number | string }, F extends keyof T, V extends T[F] = T[F]> = {
  field: F;
  activeValue: V;
  inactiveValue: V;
  setData: Dispatch<SetStateAction<T[]>>;
  setMeta: Dispatch<SetStateAction<TableMeta>>;
  stadeFilter: string;
  updateFn: (id: T["id"], nextValue: V) => Promise<unknown>;
  confirmTitle: (isActive: boolean) => string;
  confirmText: (isActive: boolean) => string;
  confirmButtonText?: (isActive: boolean) => string;
  successMessage: (isActive: boolean) => string;
};

/**
 * Encapsulates the "confirm → optimistically update → call the API →
 * revert on failure" pattern repeated across modules with a state
 * toggle (affiliates, doctors, etc.). See spec 2026-08-07 for details
 * on where this block lived before being extracted.
 */
export function useOptimisticToggle<T extends { id: number | string }, F extends keyof T, V extends T[F] = T[F]>(
  opts: Options<T, F, V>,
) {
  return async (item: T) => {
    const isActive = item[opts.field] === opts.activeValue;
    const nextValue: V = isActive ? opts.inactiveValue : opts.activeValue;
    const previousValue = item[opts.field];

    try {
      const ok = await alert.confirm({
        title: opts.confirmTitle(isActive),
        text: opts.confirmText(isActive),
        confirmButtonText: opts.confirmButtonText?.(isActive) ?? (isActive ? "Sí, inactivar" : "Sí, activar"),
        cancelButtonText: "Cancelar",
        onConfirm: async () => {
          opts.setData((prev) => prev.map((x) => (x.id === item.id ? { ...x, [opts.field]: nextValue } : x)));
          await opts.updateFn(item.id, nextValue);
        },
      });

      if (ok) {
        await alert.success("Actualizado", opts.successMessage(isActive));
        if (opts.stadeFilter !== "all") {
          opts.setData((prev) => prev.filter((x) => x.id !== item.id));
          opts.setMeta((m) => ({ ...m, total: m.total - 1 }));
        }
      }
    } catch (err) {
      opts.setData((prev) => prev.map((x) => (x.id === item.id ? { ...x, [opts.field]: previousValue } : x)));
      await alert.error("Error", getApiErrorMessage(err));
    }
  };
}
