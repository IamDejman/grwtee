"use client";

import * as React from "react";
import { DayPicker, type DateRange as RdpRange } from "react-day-picker";
import "react-day-picker/style.css";

export type DateRangeValue = { from: string | null; to: string | null };

type SingleProps = {
  mode: "single";
  value: string | null;
  onChange: (value: string | null) => void;
};

type RangeProps = {
  mode: "range";
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
};

type CommonProps = {
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
};

type Props = (SingleProps | RangeProps) & CommonProps;

function toISO(d?: Date): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromISO(iso?: string | null): Date | undefined {
  if (!iso) return undefined;
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return undefined;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDisplay(d?: Date): string {
  if (!d) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

const baseInputClass =
  "mt-1 flex w-full items-center justify-between rounded-md border border-gray-medium bg-white px-3 py-2 text-left text-sm text-gray-dark transition focus:border-green-dark focus:outline-none disabled:opacity-60";

export function DatePicker(props: Props) {
  const reactId = React.useId();
  const triggerId = props.id || `dp-${reactId}`;
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  let display = "";
  if (props.mode === "single") {
    const d = fromISO(props.value);
    display = d ? formatDisplay(d) : "";
  } else {
    const f = fromISO(props.value.from);
    const t = fromISO(props.value.to);
    if (f && t) display = `${formatDisplay(f)} – ${formatDisplay(t)}`;
    else if (f) display = `${formatDisplay(f)} – …`;
  }

  const placeholder =
    props.placeholder ||
    (props.mode === "range" ? "Pick a date range" : "Pick a date");

  return (
    <div ref={wrapRef} className={["relative", props.className || ""].join(" ")}>
      {props.label ? (
        <label
          htmlFor={triggerId}
          className="block text-sm font-semibold text-gray-dark"
        >
          {props.label}{" "}
          {props.required ? <span className="text-red-600">*</span> : null}
        </label>
      ) : null}
      <button
        id={triggerId}
        type="button"
        disabled={props.disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={baseInputClass}
      >
        <span className={display ? "text-gray-dark" : "text-gray-dark/50"}>
          {display || placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-2 h-4 w-4 text-gray-dark/60"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open ? (
        <div
          role="dialog"
          className="absolute left-0 z-50 mt-1 rounded-lg border border-gray-medium/60 bg-white p-2 shadow-lg"
        >
          {props.mode === "single" ? (
            <DayPicker
              mode="single"
              selected={fromISO(props.value)}
              onSelect={(d) => {
                props.onChange(toISO(d));
                if (d) setOpen(false);
              }}
              showOutsideDays
              weekStartsOn={1}
              className="rdp-grwtee"
            />
          ) : (
            <DayPicker
              mode="range"
              selected={{
                from: fromISO(props.value.from),
                to: fromISO(props.value.to)
              }}
              onSelect={(r: RdpRange | undefined) => {
                if (!r) {
                  props.onChange({ from: null, to: null });
                  return;
                }
                const next: DateRangeValue = {
                  from: toISO(r.from),
                  to: toISO(r.to)
                };
                props.onChange(next);
                if (r.from && r.to) setOpen(false);
              }}
              numberOfMonths={2}
              showOutsideDays
              weekStartsOn={1}
              className="rdp-grwtee"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
