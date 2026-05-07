"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Estructura de cada opción del select
export interface SelectOption {
  value: string | number; // valor que se guarda (ej. id)
  label: string;          // texto que se muestra al usuario
}

interface SearchableSelectProps {
  options: SelectOption[];          // lista de opciones a mostrar
  value: string | number;           // valor seleccionado actualmente (controlado desde el padre)
  onChange: (value: string) => void; // callback que recibe el value del ítem elegido
  placeholder?: string;             // texto cuando el dropdown está abierto y no hay selección
  disabledPlaceholder?: string;     // texto a mostrar en modo disabled si no hay match en options
  disabled?: boolean;               // si true, muestra un input de solo lectura (modo vista)
  className?: string;               // clases extra para el contenedor
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar…",
  disabledPlaceholder,
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);   // controla si el dropdown está visible
  const [search, setSearch] = useState("");  // texto de búsqueda que escribe el usuario
  const containerRef = useRef<HTMLDivElement>(null); // referencia al contenedor para detectar clicks fuera
  const inputRef = useRef<HTMLInputElement>(null);   // referencia al input para darle foco al abrir

  // Busca la opción que coincide con el value actual (comparación como string para evitar "1" !== 1)
  const selected = options.find((o) => String(o.value) === String(value));

  // Filtra las opciones según el texto escrito; si no hay búsqueda, muestra todas
  const filtered =
    search.trim()
      ? options.filter((o) =>
          o.label.toLowerCase().includes(search.toLowerCase()),
        )
      : options;

  // Cierra el dropdown cuando el usuario hace click fuera del componente
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Modo solo lectura (isView): renderiza un input deshabilitado con el label del valor actual.
  // Se resuelve en orden: label encontrado en options → disabledPlaceholder → cadena vacía.
  // disabledPlaceholder es útil cuando el label viene de un objeto anidado del API (ej. initial.city.name).
  if (disabled) {
    return (
      <input
        disabled
        value={selected?.label || disabledPlaceholder || ""}
        className={cn(
          "w-full rounded-lg border px-3 py-2 cursor-not-allowed bg-gray-100 dark:bg-dark-2",
          className,
        )}
        readOnly
      />
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Contenedor del input visible — actúa como trigger del dropdown */}
      <div
        className={cn(
          "flex items-center w-full rounded-lg border border-stroke bg-transparent px-3 py-2 transition-colors",
          "dark:border-dark-3 dark:bg-dark-2",
          open
            ? "border-primary dark:border-primary"          // borde azul cuando está abierto
            : "hover:border-gray-400 dark:hover:border-dark-4",
        )}
        onClick={() => {
          setOpen((o) => !o);
          // Da foco al input en el siguiente tick para que el cursor aparezca al abrir
          if (!open) setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        {/*
          Input con doble comportamiento según el estado:
          - Cerrado (readOnly): muestra el label de la opción seleccionada, no es editable
          - Abierto: muestra el texto de búsqueda y permite escribir para filtrar
        */}
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-sm text-dark dark:text-white outline-none cursor-pointer placeholder:text-dark-5 dark:placeholder:text-dark-6"
          placeholder={selected ? selected.label : placeholder}
          value={open ? search : selected?.label ?? ""}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onClick={(e) => {
            e.stopPropagation(); // evita que el click llegue al div padre y dispare el toggle
            if (!open) {
              setOpen(true);
              setSearch(""); // limpia el filtro al abrir para mostrar todas las opciones
            }
          }}
          readOnly={!open} // solo editable cuando el dropdown está abierto
        />

        {/* Flecha que rota 180° cuando el dropdown está abierto */}
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 flex-shrink-0 text-dark-5 transition-transform duration-200 dark:text-dark-6",
            open && "rotate-180",
          )}
        />
      </div>

      {/* Dropdown de opciones — solo se monta cuando open=true */}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-dark-5 dark:text-dark-6">
              Sin resultados
            </div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                // preventDefault en mousedown evita que el listener "onClickOutside" detecte
                // este click como "fuera del componente" y cierre el dropdown antes del onClick
                onMouseDown={(e) => e.preventDefault()}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm transition-colors",
                  "text-dark dark:text-white hover:bg-gray-2 dark:hover:bg-dark-3",
                  // resalta la opción actualmente seleccionada
                  String(o.value) === String(value) &&
                    "bg-primary/10 text-primary font-medium dark:bg-primary/20",
                )}
                onClick={() => {
                  onChange(String(o.value)); // notifica al padre con el value elegido
                  setOpen(false);
                  setSearch("");
                }}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
