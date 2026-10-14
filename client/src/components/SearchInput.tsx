import { Search, X } from "lucide-react";
import React, { forwardRef, useId, useImperativeHandle, useRef } from "react";

export type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  label?: string;
  id?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  size?: "default" | "sm";
  variant?: "sunken" | "white";
  name?: string;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

/**
 * Reusable, accessible search box with animated one-tap Clear (X) button
 * and smooth auto-focus glow bloom.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    value,
    onChange,
    onClear,
    placeholder = "Search...",
    label,
    id,
    className = "",
    inputClassName = "",
    autoFocus = false,
    disabled = false,
    size = "default",
    variant = "sunken",
    name,
    onKeyDown,
  },
  forwardedRef,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const internalRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(forwardedRef, () => internalRef.current as HTMLInputElement);

  const handleClear = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onChange("");
    onClear?.();
    internalRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && value) {
      event.preventDefault();
      event.stopPropagation();
      onChange("");
      onClear?.();
      return;
    }
    onKeyDown?.(event);
  };

  const bgClass = variant === "white" ? "bg-white" : "bg-j-surface-sunken";
  const sizeClass = size === "sm" ? "h-9 text-xs pl-8 pr-8" : "h-control text-sm pl-10 pr-9";
  const iconSizeClass = size === "sm" ? "size-3.5 left-2.5" : "size-4 left-3";

  return (
    <label htmlFor={inputId} className={`group relative block ${className}`}>
      <span className="sr-only">{label ?? placeholder}</span>
      <Search
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-j-ink-faint transition-colors duration-200 group-focus-within:text-j-accent ${iconSizeClass}`}
      />
      <input
        ref={internalRef}
        id={inputId}
        name={name}
        type="text"
        role="searchbox"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={event => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`search-input-glow w-full rounded-xl border border-j-border outline-none transition-all duration-200 placeholder:text-j-ink-faint focus:border-j-accent focus:ring-4 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-55 ${bgClass} ${sizeClass} ${inputClassName}`}
      />
      <button
        type="button"
        tabIndex={value ? 0 : -1}
        aria-label="Clear search"
        onClick={handleClear}
        className={`absolute right-2 top-1/2 grid -translate-y-1/2 place-items-center rounded-full p-1 text-j-ink-faint transition-all duration-200 hover:bg-j-surface-muted hover:text-j-ink active:scale-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent ${
          value ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0"
        }`}
      >
        <X className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden="true" />
      </button>
    </label>
  );
});

export default SearchInput;
