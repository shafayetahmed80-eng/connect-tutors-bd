import React from "react";
import { formatSalaryInput, parseSalaryAmount } from "@shared/salary-amount";

/** The currency word, kept here so every money field says it the same way. */
export const MONEY_SUFFIX = "Taka";

/**
 * A field for an amount of money, with the currency word inside the box.
 *
 * The word used to sit on a line underneath, which read as a result rather
 * than a unit: the Guardian saw "5,000 Taka" appear below and reasonably
 * wondered whether they were meant to type the word themselves. Inside the
 * box, to the right of what they typed, it reads as the unit it is.
 *
 * It appears only once there is a number to attach it to, so an empty field
 * keeps its placeholder legible.
 *
 * `formatOnBlur` regroups the digits when the field is left - `5000` becomes
 * `5,000`. It is off by default because it only makes sense where the typed
 * text is what gets stored; a filter that strips to digits on every keystroke
 * would throw the commas away again on the next render.
 */
export function MoneyAmountField({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  ariaLabel,
  inputClassName,
  formatOnBlur = false,
  maxLength = 12,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** Needed wherever the visible label does not already name the currency. */
  ariaLabel?: string;
  inputClassName: string;
  formatOnBlur?: boolean;
  maxLength?: number;
}) {
  const amount = parseSalaryAmount(value);
  const showSuffix = amount !== null;

  return <span className="relative block">
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={event => onChange(event.target.value)}
      onBlur={() => {
        if (formatOnBlur && amount !== null) onChange(formatSalaryInput(amount));
        onBlur?.();
      }}
      // Room for the word, but only while the word is there.
      className={`${inputClassName}${showSuffix ? " pr-16" : ""}`}
    />
    {showSuffix
      // Decorative: the field's own label names the currency for a screen
      // reader, so repeating it here would only say it twice.
      ? <span aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#126ea9]">{MONEY_SUFFIX}</span>
      : null}
  </span>;
}
