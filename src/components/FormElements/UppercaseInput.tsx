"use client";

import { cn } from "@/lib/utils";

/**
 * Turns the node's text into UPPERCASE in place.
 *
 * Done on the DOM node before the parent's `onChange` runs, so callers keep reading
 * `e.target.value` as usual and store the uppercase text. The selection is restored afterwards
 * because assigning `value` sends the caret to the end, which would break editing in the middle
 * of a word.
 */
function uppercaseInPlace(el: HTMLInputElement | HTMLTextAreaElement) {
  const upper = el.value.toUpperCase();
  if (upper === el.value) return;

  const { selectionStart, selectionEnd } = el;
  el.value = upper;
  el.setSelectionRange(selectionStart, selectionEnd);
}

/**
 * Text input that turns everything typed into UPPERCASE.
 *
 * The `uppercase` class covers what typing cannot: text that was saved in lowercase before this
 * rule existed is still shown in uppercase (display only; it is stored uppercase on the next save).
 *
 * Only for free-text fields. Emails, logins, passwords and codes must use a plain input.
 */
export function UppercaseInput({
  className,
  onChange,
  ...props
}: React.ComponentProps<"input">) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    uppercaseInPlace(e.target);
    onChange?.(e);
  }

  return <input {...props} className={cn("uppercase", className)} onChange={handleChange} />;
}

/** Same as `UppercaseInput`, for multi-line free text (e.g. affiliate notes). */
export function UppercaseTextarea({
  className,
  onChange,
  ...props
}: React.ComponentProps<"textarea">) {
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    uppercaseInPlace(e.target);
    onChange?.(e);
  }

  return <textarea {...props} className={cn("uppercase", className)} onChange={handleChange} />;
}
