"use client";

import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions
} from "@headlessui/react";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import { useMemo, useState } from "react";
import { inputClass } from "./primitives";

interface CountryOption {
  code: CountryCode;
  name: string;
  dial: string;
  flag: string;
}

function flagEmoji(code: string): string {
  return String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

function useCountries(): CountryOption[] {
  return useMemo(() => {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return getCountries()
      .map((code) => ({
        code,
        name: names.of(code) ?? code,
        dial: `+${getCountryCallingCode(code)}`,
        flag: flagEmoji(code)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);
}

export function PhoneField({
  country,
  value,
  onCountryChange,
  onChange,
  invalid
}: {
  country: string;
  value: string;
  onCountryChange: (code: string) => void;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  const countries = useCountries();
  const [query, setQuery] = useState("");
  const selected = countries.find((c) => c.code === country) ?? null;

  const q = query.trim().toLowerCase().replace(/^\+/, "");
  const filtered = q
    ? countries.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase() === q ||
          c.dial.slice(1).startsWith(q)
      )
    : countries;

  return (
    <div className="flex items-end gap-4">
      <Combobox
        value={selected}
        onChange={(c: CountryOption | null) => c && onCountryChange(c.code)}
        onClose={() => setQuery("")}
      >
        <div className="relative w-[8.5rem] shrink-0">
          <ComboboxInput
            aria-label="Country code"
            className={`${inputClass} pr-6`}
            displayValue={(c: CountryOption | null) => (c ? `${c.flag} ${c.dial}` : "")}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Country"
            autoComplete="off"
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center text-lilac" aria-label="Show countries">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </ComboboxButton>
        </div>
        <ComboboxOptions
          anchor={{ to: "bottom start", gap: 8 }}
          className="z-[70] max-h-72 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-night-line bg-night-raised p-1 shadow-2xl [--anchor-max-height:18rem] empty:invisible"
        >
          {filtered.map((c) => (
            <ComboboxOption
              key={c.code}
              value={c}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 font-body text-sm text-lilac data-[focus]:bg-night-line/70 data-[focus]:text-cream data-[selected]:text-gold"
            >
              <span aria-hidden="true">{c.flag}</span>
              <span className="flex-1 truncate">{c.name}</span>
              <span className="tabular-nums lining-nums">{c.dial}</span>
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </Combobox>

      <input
        id="whatsapp"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        aria-label="WhatsApp number"
        aria-invalid={invalid}
        className={inputClass}
        placeholder="WhatsApp number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
