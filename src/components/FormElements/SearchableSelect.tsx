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
  loading?: boolean;                // if true, shows a disabled spinner state (e.g. cities being fetched)
  className?: string;               // extra classes for the container
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar…",
  disabledPlaceholder,
  disabled = false,
  loading = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);   // controls whether the dropdown is visible
  const [search, setSearch] = useState("");  // search text typed by the user
  const [activeIndex, setActiveIndex] = useState(-1); // keyboard/mouse highlighted option within `filtered` (-1 = none)
  const containerRef = useRef<HTMLDivElement>(null); // reference to the container to detect outside clicks
  const listRef = useRef<HTMLDivElement>(null);      // reference to the options list to keep the active option visible
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

  // Opens the dropdown with the full list, starting the highlight on the current selection.
  // With an empty search `filtered` is the whole `options` array, so the indexes match.
  function openDropdown() {
    setOpen(true);
    setSearch("");
    setActiveIndex(
      options.findIndex((o) => String(o.value) === String(value)),
    );
  }

  // Moves the highlight by `step` (+1 / -1), wrapping around at both ends
  function moveActive(step: 1 | -1) {
    const count = filtered.length;
    if (count === 0) return;
    setActiveIndex((i) =>
      i < 0 ? (step > 0 ? 0 : count - 1) : (i + step + count) % count,
    );
  }

  // Notifies the parent with the chosen value and resets the dropdown
  function selectOption(o: SelectOption) {
    onChange(String(o.value));
    setOpen(false);
    setSearch("");
  }

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

  // Keeps the highlighted option inside the scrollable list while navigating with the arrows
  useEffect(() => {
    if (open && activeIndex >= 0) {
      listRef.current?.children[activeIndex]?.scrollIntoView?.({ block: "nearest" });
    }
  }, [open, activeIndex]);

  // Read-only mode (isView): renders a disabled input with the current value's label.
  // Resolved in order: label found in options → disabledPlaceholder → empty string.
  // disabledPlaceholder is useful when the label comes from a nested API object (e.g. initial.city.name).
  if (disabled) {
    return (
      <input
        disabled
        value={selected?.label || disabledPlaceholder || ""}
        className={cn(
          "w-full rounded-lg border px-3 py-2 cursor-not-allowed bg-gray-100 dark:bg-dark-2 uppercase",
          className,
        )}
        readOnly
      />
    );
  }

  // Loading mode (e.g. fetching cities for the chosen department): shows a disabled box with a
  // spinner instead of the dropdown trigger, so the wait doesn't look like the field is stuck.
  if (loading) {
    return (
      <div
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark-5 dark:border-dark-3 dark:text-dark-6",
          className,
        )}
      >
        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Cargando…
      </div>
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
          if (open) {
            setOpen(false);
            return;
          }
          openDropdown();
          // Focuses the input on the next tick so the cursor appears on open
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        {/*
          Input with dual behavior depending on state:
          - Closed (readOnly): shows the selected option's label, not editable
          - Open: shows the search text and allows typing to filter
        */}
        <input
          ref={inputRef}
          // uppercase: the options are database labels (cities, doctors, franchises...) that are
          // shown in capitals; text-transform also applies to the typed search and the placeholder
          className="flex-1 bg-transparent text-sm text-dark dark:text-white outline-none cursor-pointer uppercase placeholder:text-dark-5 dark:placeholder:text-dark-6"
          placeholder={selected ? selected.label : placeholder}
          value={open ? search : selected?.label ?? ""}
          onChange={(e) => {
            setSearch(e.target.value);
            // Highlight the first match so Enter picks it; nothing highlighted for an empty search
            setActiveIndex(e.target.value.trim() ? 0 : -1);
            if (!open) setOpen(true);
          }}
          onClick={(e) => {
            e.stopPropagation(); // prevents the click from reaching the parent div and triggering the toggle
            if (!open) openDropdown(); // also clears the filter so all options are shown
          }}
          // Opening on focus (not only on click) matters for keyboard users: reaching the field
          // with Tab focuses a read-only input, so typing would silently do nothing until they click.
          onFocus={() => {
            if (!open) openDropdown();
          }}
          onKeyDown={(e) => {
            if (e.key === "Tab" || e.key === "Escape") {
              // Tab lets focus move on to the next field; the options are not tab stops
              setOpen(false);
              setSearch("");
              return;
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault(); // keeps the caret from jumping to the start/end of the text
              // A closed dropdown (e.g. after Escape) reopens instead of moving the highlight
              if (!open) openDropdown();
              else moveActive(e.key === "ArrowDown" ? 1 : -1);
              return;
            }
            if (e.key === "Enter" && open) {
              e.preventDefault(); // avoid submitting a surrounding form while picking an option
              // Only an explicitly highlighted option is picked, never one chosen by default
              const target = filtered[activeIndex];
              if (target) selectOption(target);
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
        <div ref={listRef} className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-dark-5 dark:text-dark-6">
              Sin resultados
            </div>
          ) : (
            filtered.map((o, i) => (
              <button
                key={o.value}
                type="button"
                // preventDefault on mousedown prevents the "onClickOutside" listener from
                // detecting this click as "outside the component" and closing the dropdown before onClick
                onMouseDown={(e) => e.preventDefault()}
                // keeps the highlight in sync with the pointer so Enter picks what is visibly marked
                onMouseMove={() => setActiveIndex(i)}
                tabIndex={-1} // keyboard users pick with Enter from the input, not by tabbing through options
                className={cn(
                  "w-full px-3 py-2 text-left text-sm uppercase transition-colors",
                  "text-dark dark:text-white hover:bg-gray-2 dark:hover:bg-dark-3",
                  // highlights the currently selected option
                  String(o.value) === String(value) &&
                    "bg-primary/10 text-primary font-medium dark:bg-primary/20",
                  // marks the option Enter would pick; a ring (not a background) when it is also
                  // the selected one so it does not override the selected-option background
                  i === activeIndex &&
                    (String(o.value) === String(value)
                      ? "ring-1 ring-inset ring-primary"
                      : "bg-gray-2 dark:bg-dark-3"),
                )}
                onClick={() => selectOption(o)}
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
