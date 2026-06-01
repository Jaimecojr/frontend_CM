"use client";

import flatpickr from "flatpickr";
import { Spanish } from "flatpickr/dist/l10n/es.js";
import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

function parseYMD(str: string): Date | null {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplay(str: string): string {
  const d = parseYMD(str);
  if (!d) return str;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const DatePickerWithToday = ({
  value,
  onChange,
  disabled = false,
  placeholder = "dd/mm/aaaa",
  className = "",
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);

  useEffect(() => {
    if (!inputRef.current || disabled) return;

    fpRef.current = flatpickr(inputRef.current, {
      locale: Spanish,
      dateFormat: "d/m/Y",
      allowInput: false,
      disableMobile: true,
      defaultDate: parseYMD(value) || undefined,
      onChange: (selectedDates) => {
        if (selectedDates[0]) {
          const y = selectedDates[0].getFullYear();
          const m = String(selectedDates[0].getMonth() + 1).padStart(2, "0");
          const d = String(selectedDates[0].getDate()).padStart(2, "0");
          onChange(`${y}-${m}-${d}`);
        }
      },
      onReady: (_dates, _str, fp) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Hoy";
        btn.className =
          "flatpickr-today-btn w-full mt-2 rounded-md bg-primary py-1.5 text-sm font-medium text-white hover:bg-opacity-90";
        btn.onclick = () => fp.setDate(new Date(), true);
        fp.calendarContainer.appendChild(btn);
      },
    });

    return () => {
      fpRef.current?.destroy();
      fpRef.current = null;
    };
  }, [disabled]);

  useEffect(() => {
    if (fpRef.current) {
      fpRef.current.setDate(parseYMD(value) || "", false);
    }
  }, [value]);

  const baseClass = "w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white";
  const disabledClass = "cursor-not-allowed bg-gray-100 dark:bg-dark-2 text-gray-500";

  if (disabled) {
    return (
      <input
        type="text"
        value={formatDisplay(value)}
        disabled
        placeholder={placeholder}
        className={`${baseClass} ${disabledClass} ${className}`}
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      className={`${baseClass} ${className}`}
    />
  );
};

export default DatePickerWithToday;
