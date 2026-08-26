"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Structure of each select option
export interface SelectOption {
  value: string | number; // value that gets stored (e.g. id)
  label: string;          // text shown to the user
}

interface SearchableSelectProps {
  options: SelectOption[];          // list of options to display
  value: string | number;           // currently selected value (controlled from the parent)
  onChange: (value: string) => void; // callback that receives the value of the chosen item
  placeholder?: string;             // text shown when the dropdown is open and there is no selection
  disabledPlaceholder?: string;     // text to show in disabled mode when there is no match in options
  disabled?: boolean;               // if true, shows a read-only input (view mode)
  className?: string;               // extra classes for the container
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
  const [open, setOpen] = useState(false);   // controls whether the dropdown is visible
  const [search, setSearch] = useState("");  // search text typed by the user
  const containerRef = useRef<HTMLDivElement>(null); // reference to the container to detect outside clicks
  const inputRef = useRef<HTMLInputElement>(null);   // reference to the input to focus it on open

  // Finds the option that matches the current value (compared as string to avoid "1" !== 1)
  const selected = options.find((o) => String(o.value) === String(value));

  // Filters the options based on the typed text; shows all of them if there is no search
  const filtered =
    search.trim()
      ? options.filter((o) =>
          o.label.toLowerCase().includes(search.toLowerCase()),
        )
      : options;

  // Closes the dropdown when the user clicks outside the component
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

  // Read-only mode (isView): renders a disabled input with the current value's label.
  // Resolved in order: label found in options → disabledPlaceholder → empty string.
  // disabledPlaceholder is useful when the label comes from a nested API object (e.g. initial.city.name).
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
      {/* Visible input container — acts as the dropdown trigger */}
      <div
        className={cn(
          "flex items-center w-full rounded-lg border border-stroke bg-transparent px-3 py-2 transition-colors",
          "dark:border-dark-3 dark:bg-dark-2",
          open
            ? "border-primary dark:border-primary"          // blue border when open
            : "hover:border-gray-400 dark:hover:border-dark-4",
        )}
        onClick={() => {
          setOpen((o) => !o);
          // Focuses the input on the next tick so the cursor appears on open
          if (!open) setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        {/*
          Input with dual behavior depending on state:
          - Closed (readOnly): shows the selected option's label, not editable
          - Open: shows the search text and allows typing to filter
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
            e.stopPropagation(); // prevents the click from reaching the parent div and triggering the toggle
            if (!open) {
              setOpen(true);
              setSearch(""); // clears the filter on open to show all options
            }
          }}
          readOnly={!open} // only editable while the dropdown is open
        />

        {/* Arrow that rotates 180° when the dropdown is open */}
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 flex-shrink-0 text-dark-5 transition-transform duration-200 dark:text-dark-6",
            open && "rotate-180",
          )}
        />
      </div>

      {/* Options dropdown — only mounted when open=true */}
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
                // preventDefault on mousedown prevents the "onClickOutside" listener from
                // detecting this click as "outside the component" and closing the dropdown before onClick
                onMouseDown={(e) => e.preventDefault()}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm transition-colors",
                  "text-dark dark:text-white hover:bg-gray-2 dark:hover:bg-dark-3",
                  // highlights the currently selected option
                  String(o.value) === String(value) &&
                    "bg-primary/10 text-primary font-medium dark:bg-primary/20",
                )}
                onClick={() => {
                  onChange(String(o.value)); // notifies the parent with the chosen value
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
