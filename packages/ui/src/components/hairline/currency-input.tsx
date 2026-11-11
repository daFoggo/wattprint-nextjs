"use client";

import * as React from "react";
import { Field, fieldSurface, useFieldIds, useShake, type FieldSize } from "./field";
import { NumberRoll } from "./number-roll";
import { TextMorph } from "./text-morph";
import { EASE_OUT, interactionIcon, useInteractionReducedMotion } from "./ui-interaction-motion";

export interface CurrencyInputProps {
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  onValueCommit?: (value: number | null) => void;
  locale?: string;
  currency?: string;
  min?: number;
  max?: number;
  step?: number;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  placeholder?: string;
  clearable?: boolean;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  size?: FieldSize;
  id?: string;
  className?: string;
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5">
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CurrencyInput({
  value,
  defaultValue = null,
  onValueChange,
  onValueCommit,
  locale = "en-US",
  currency = "USD",
  min = -Infinity,
  max = Infinity,
  step = 1,
  label,
  hint,
  error,
  placeholder,
  clearable = false,
  required,
  disabled,
  name,
  size = "md",
  id,
  className = "",
}: CurrencyInputProps) {
  const reduced = useInteractionReducedMotion();
  const ids = useFieldIds(id);
  const input = React.useRef<HTMLInputElement>(null);
  const [own, setOwn] = React.useState<number | null>(defaultValue);
  const current = value !== undefined ? value : own;
  const [draft, setDraft] = React.useState<string | null>(null);
  const [badInput, setBadInput] = React.useState<string | null>(null);

  const currencyFormat = React.useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency }), [locale, currency]);
  const fractionDigits = currencyFormat.resolvedOptions().maximumFractionDigits ?? 2;
  const numberFormat = React.useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }),
    [locale, fractionDigits],
  );
  const currencyParts = React.useMemo(() => currencyFormat.formatToParts(1234.5), [currencyFormat]);
  const symbol = currencyParts.filter((part) => part.type === "currency").map((part) => part.value).join("");
  const currencyIndex = currencyParts.findIndex((part) => part.type === "currency");
  const numberIndex = currencyParts.findIndex((part) => part.type === "integer");
  const symbolFirst = currencyIndex < numberIndex;
  const separators = React.useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).formatToParts(12345.6), [locale]);
  const group = separators.find((part) => part.type === "group")?.value ?? ",";
  const decimal = separators.find((part) => part.type === "decimal")?.value ?? ".";
  const sm = size === "sm";
  const integerFormat = React.useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale]);
  const [focused, setFocused] = React.useState(false);
  const caret = React.useRef<number | null>(null);

  /*
   * What the field shows while typing: the integer part grouped as the locale groups it, the decimals as typed (no
   * more than the currency allows). Separators appear under the caret without moving it: the caret is put back after
   * the same number of digits it had before.
   */
  const live = (text: string) => {
    const negative = /^\s*-/.test(text);
    const at = fractionDigits > 0 ? text.lastIndexOf(decimal) : -1;
    const whole = (at >= 0 ? text.slice(0, at) : text).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    const fraction = at >= 0 ? text.slice(at + decimal.length).replace(/\D/g, "").slice(0, fractionDigits) : "";
    const grouped = whole ? integerFormat.format(Number(whole)) : "";
    return `${negative && min < 0 ? "-" : ""}${grouped}${at >= 0 ? decimal + fraction : ""}`;
  };
  /** How many digits, signs and decimal marks come before `end`: the caret's place, ignoring separators. */
  const significant = (text: string, end: number) => {
    let count = 0;
    for (let i = 0; i < end; i++) if (/[\d-]/.test(text[i]) || text.startsWith(decimal, i)) count++;
    return count;
  };
  const caretAfter = (text: string, count: number) => {
    if (count <= 0) return 0;
    let seen = 0;
    for (let i = 0; i < text.length; i++) {
      if (/[\d-]/.test(text[i]) || text.startsWith(decimal, i)) seen++;
      if (seen === count) return i + 1;
    }
    return text.length;
  };
  React.useLayoutEffect(() => {
    if (caret.current === null || !input.current) return;
    input.current.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  });

  const parseAmount = (text: string): number | null => {
    let normalised = text.trim().replaceAll(symbol, "").replace(/\s/g, "");
    if (group) normalised = normalised.replaceAll(group, "");
    if (decimal !== ".") normalised = normalised.replaceAll(decimal, ".");
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalised)) return null;
    const parsed = Number(normalised);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const round = (amount: number) => Number(amount.toFixed(Math.max(fractionDigits, String(step).split(".")[1]?.length ?? 0)));
  const store = (next: number | null, notify: boolean) => {
    if (value === undefined) setOwn(next);
    if (notify) onValueChange?.(next);
  };

  const settle = () => {
    if (draft === null) return true;
    const text = draft.trim();
    if (!text) {
      store(null, false);
      onValueCommit?.(null);
      setDraft(null);
      setBadInput(null);
      return true;
    }
    const parsed = parseAmount(text);
    if (parsed === null) {
      setBadInput("Enter a valid amount.");
      return false;
    }
    if (parsed < min || parsed > max) {
      const range = Number.isFinite(min) && Number.isFinite(max) ? `between ${numberFormat.format(min)} and ${numberFormat.format(max)}` : Number.isFinite(min) ? `at least ${numberFormat.format(min)}` : `no more than ${numberFormat.format(max)}`;
      setBadInput(`Use an amount ${range}.`);
      return false;
    }
    const next = Number(parsed.toFixed(fractionDigits));
    store(next, next !== current);
    onValueCommit?.(next);
    setDraft(null);
    setBadInput(null);
    return true;
  };

  const bump = () => {
    if (reduced) return;
    input.current?.parentElement?.animate(
      [{ transform: "none" }, { transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "translateX(-1px)" }, { transform: "none" }],
      { duration: 280, easing: "ease-out" },
    );
  };

  const stepBy = (direction: 1 | -1, multiplier = 1) => {
    const typed = draft !== null ? parseAmount(draft) : null;
    const base = typed ?? current ?? 0;
    const next = round(Math.min(max, Math.max(min, base + direction * step * multiplier)));
    if (next === current || next === typed) {
      bump();
      return;
    }
    store(next, true);
    onValueCommit?.(next);
    setDraft(live(String(next).replace(".", decimal)));
    setBadInput(null);
    requestAnimationFrame(() => {
      const length = input.current?.value.length ?? 0;
      input.current?.setSelectionRange(length, length);
    });
  };

  const shown = draft ?? (current === null ? "" : numberFormat.format(current));
  // At rest the amount is drawn by NumberRoll over the field (same box, same type), so a new value rolls into place.
  const rolling = !focused && draft === null && current !== null;
  const showClear = clearable && !disabled && shown.length > 0;
  const describedBy = [hint && !error && !badInput ? ids.hint : null, error || badInput ? ids.error : null].filter(Boolean).join(" ") || undefined;
  const shakeRef = useShake<HTMLDivElement>(!!error || !!badInput);
  const symbolNode = (
    <span className={`flex shrink-0 items-center text-muted-foreground ${sm ? "text-[12px]" : "text-[13px]"}`}>
      <TextMorph animateWidth={false}>{symbol}</TextMorph>
    </span>
  );

  return (
    <Field id={ids.id} label={label} hint={hint} error={error ?? badInput} required={required} className={className}>
      <div ref={shakeRef} className={`${fieldSurface({ invalid: !!error || !!badInput, disabled })} ${sm ? "h-7 text-[16px] sm:text-[12.5px]" : "h-9 text-[16px] sm:text-[13.5px]"}`}>
        {symbolFirst && <span className={sm ? "pl-3" : "pl-4"}>{symbolNode}</span>}
        <span className="relative flex h-full min-w-0 flex-1">
        <input
          ref={input}
          id={ids.id}
          value={shown}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          required={required}
          disabled={disabled}
          placeholder={placeholder ?? numberFormat.format(0)}
          aria-invalid={error || badInput ? true : undefined}
          aria-describedby={describedBy}
          onFocus={() => {
            setFocused(true);
            setDraft(current === null ? "" : live(String(current).replace(".", decimal)));
            setBadInput(null);
          }}
          onChange={(e) => {
            const raw = e.target.value;
            const nextText = live(raw);
            caret.current = caretAfter(nextText, significant(raw, e.target.selectionStart ?? raw.length));
            setDraft(nextText);
            setBadInput(null);
            const parsed = parseAmount(nextText);
            if (!nextText.trim()) store(null, true);
            else if (parsed !== null) store(parsed, true);
          }}
          onBlur={() => {
            setFocused(false);
            settle();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              settle();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setDraft(null);
              setBadInput(null);
            } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              stepBy(e.key === "ArrowUp" ? 1 : -1, e.shiftKey ? 10 : 1);
            }
          }}
          className={`h-full w-full min-w-0 bg-transparent tabular-nums outline-none placeholder:text-muted-foreground/70 ${sm ? "px-2.5" : "px-3"} ${showClear ? "pr-1" : ""} ${rolling ? "text-transparent" : ""}`}
        />
        {rolling && (
          <span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-0 flex items-center tabular-nums text-foreground ${sm ? "px-2.5" : "px-3"}`}>
            <NumberRoll value={current} locales={locale} format={{ minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }} />
          </span>
        )}
        </span>
        {!symbolFirst && <span className={showClear ? "" : sm ? "pr-3" : "pr-4"}>{symbolNode}</span>}
        {clearable && (
          <span className="grid shrink-0" style={{ gridTemplateColumns: showClear ? "1fr" : "0fr", transition: reduced ? "none" : `grid-template-columns 320ms ${EASE_OUT}` }}>
            <span className="min-w-0 overflow-hidden">
              <button
                type="button"
                tabIndex={showClear ? 0 : -1}
                aria-hidden={!showClear}
                aria-label="Clear amount"
                onClick={() => {
                  store(null, true);
                  onValueCommit?.(null);
                  setDraft("");
                  setBadInput(null);
                  input.current?.focus();
                }}
                className={`mr-1 flex items-center justify-center rounded-full text-muted-foreground cursor-pointer outline-none hover:bg-accent hover:text-foreground focus-visible:shadow-[inset_0_0_0_2px_var(--ring)] ${sm ? "size-5" : "size-7"}`}
                style={interactionIcon(showClear, reduced)}
              >
                <ClearIcon />
              </button>
            </span>
          </span>
        )}
      </div>
      {name && <input type="hidden" name={name} value={current ?? ""} />}
    </Field>
  );
}

export default CurrencyInput;
