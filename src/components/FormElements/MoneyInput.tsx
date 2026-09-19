"use client";

import { useLayoutEffect, useReducer, useRef } from "react";
import { formatThousands } from "@/lib/format-number";

interface MoneyInputProps {
  value: number | string | null | undefined; // amount owned by the parent (the API may return it as a string)
  onChange: (value: number) => void;         // receives a plain non-negative integer, 0 when empty
  disabled?: boolean;
  className?: string;
  placeholder?: string;                      // shown while the amount is 0
  maxDigits?: number;                        // cap so the value fits the integer DB column
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

/**
 * Integer amount input that shows "." thousands separators while typing.
 *
 * It is a text input on purpose: `type="number"` cannot render separators, and a controlled
 * number input backed by a numeric state can never be emptied (clearing it yields 0, which is
 * rendered right back as "0"). Here 0 is displayed as an empty field with a "0" placeholder, so
 * the user can delete everything and type from scratch.
 */
export function MoneyInput({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "0",
  maxDigits = 9,
}: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Digits that were to the left of the caret after the last edit, used to put the caret back
  // in the same logical spot once the text is re-formatted.
  const caretDigits = useRef<number | null>(null);
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const amount = Number(value) || 0;
  const display = amount > 0 ? formatThousands(amount) : disabled ? "0" : "";

  // Reformatting inserts/removes dots, which makes the browser send the caret to the end.
  // Runs after every render (not only when the value changes) because a rejected keystroke
  // re-renders nothing yet still resets the caret.
  useLayoutEffect(() => {
    const input = inputRef.current;
    const digitsBefore = caretDigits.current;
    if (!input || digitsBefore === null) return;
    caretDigits.current = null;

    let pos = 0;
    let seen = 0;
    while (pos < display.length && seen < digitsBefore) {
      if (/\d/.test(display[pos])) seen++;
      pos++;
    }
    input.setSelectionRange(pos, pos);
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;
    let digits = onlyDigits(raw);
    let digitsBeforeCaret = onlyDigits(raw.slice(0, caret)).length;

    // Backspace/Delete next to a thousands dot removes only the dot, so the digits are unchanged
    // and the key would seem dead. Remove the neighbouring digit instead.
    const currentDigits = amount > 0 ? String(amount) : "";
    if (digits === currentDigits && raw.length < display.length && digits.length > 0) {
      const inputType = (e.nativeEvent as InputEvent).inputType;
      if (inputType === "deleteContentForward") {
        digits = digits.slice(0, digitsBeforeCaret) + digits.slice(digitsBeforeCaret + 1);
      } else if (digitsBeforeCaret > 0) {
        digits = digits.slice(0, digitsBeforeCaret - 1) + digits.slice(digitsBeforeCaret);
        digitsBeforeCaret -= 1;
      }
    }

    const withoutLeadingZeros = digits.replace(/^0+/, "");
    digitsBeforeCaret = Math.max(0, digitsBeforeCaret - (digits.length - withoutLeadingZeros.length));
    digits = withoutLeadingZeros.slice(0, maxDigits);
    digitsBeforeCaret = Math.min(digitsBeforeCaret, digits.length);

    const next = digits ? Number(digits) : 0;
    caretDigits.current = digitsBeforeCaret;
    if (next === amount) rerender(); // nothing changed upstream: force the caret restore anyway
    else onChange(next);
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={display}
      placeholder={placeholder}
      disabled={disabled}
      onChange={handleChange}
      className={className}
    />
  );
}
