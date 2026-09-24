"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type CounselorOption = { id: number; name: string; lastname: string };

/**
 * Debounced counselor autocomplete for Reports filters. A plain unfiltered
 * dropdown doesn't work here: the backend caps `/catalogs/counselors` at 20
 * results, so search is required to reach counselors past that cap. Search
 * only fires at 2+ trimmed characters and is debounced 300ms to avoid a
 * request per keystroke; a stale response (from a query the user has since
 * changed) is dropped instead of overwriting newer, already-rendered results.
 */
export function CounselorSearchSelect({
  value,
  onChange,
  placeholder = "Buscar asesor...",
}: {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CounselorOption[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  // A preset `value` (bookmark, page reload, "Limpiar filtros" elsewhere)
  // never went through `select()`, so there's no label to show for it — and
  // if `value` is cleared externally, any label from a previous selection
  // must not linger and get shown for whatever gets preset next.
  useEffect(() => {
    if (!value) setSelectedLabel("");
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Cancels any pending debounced search so it can't fire (and touch state)
  // after this component is gone.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const search = (trimmed: string) => {
    latestQueryRef.current = trimmed;
    apiFetch<{ data: CounselorOption[] }>(
      `/api/reports/catalogs/counselors?search=${encodeURIComponent(trimmed)}`,
    )
      .then((res) => {
        if (latestQueryRef.current === trimmed) setResults(res.data ?? []);
      })
      .catch(() => {
        // A failed lookup just shows no results — there's no retry affordance,
        // and the request already isn't part of any user-facing save flow.
        if (latestQueryRef.current === trimmed) setResults([]);
      });
  };

  const handleQueryChange = (v: string) => {
    setQuery(v);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = v.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => search(trimmed), 300);
  };

  const select = (c: CounselorOption) => {
    onChange(String(c.id));
    setSelectedLabel(`${c.name} ${c.lastname}`);
    setQuery("");
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setSelectedLabel("");
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <input
        type="text"
        role="textbox"
        className="h-9 w-full sm:w-56 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 pr-7 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
        placeholder={value ? selectedLabel || "Asesor seleccionado" : placeholder}
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          title="Limpiar asesor"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-5 hover:text-red-500 dark:text-dark-6"
        >
          ×
        </button>
      )}
      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full sm:w-56 max-h-52 overflow-y-auto rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-dark-5 dark:text-dark-6">Sin resultados</div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                className="w-full px-3 py-2 text-left text-sm uppercase text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
                onClick={() => select(c)}
              >
                {c.name} {c.lastname}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
