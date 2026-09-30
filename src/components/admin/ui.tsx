import * as React from "react";
import type { LucideIcon } from "lucide-react";

/** Shared building blocks so every admin page looks and behaves the same. */

export function PageHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-cormorant text-3xl font-medium leading-tight text-atelier-ink sm:text-4xl">{title}</h1>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  actions,
  className,
  children
}: {
  title?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-atelier-border bg-white p-4 sm:p-6 ${className ?? ""}`}>
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? <h2 className="font-cormorant text-2xl font-medium text-atelier-ink">{title}</h2> : <span />}
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export type Tone = "neutral" | "gold" | "green" | "purple" | "red";

const toneClass: Record<Tone, string> = {
  neutral: "bg-atelier-canvas text-atelier-muted ring-atelier-border",
  gold: "bg-gold/15 text-[#8A6420] ring-gold/30",
  green: "bg-green-dark/10 text-green-dark ring-green-dark/20",
  purple: "bg-atelier-lavender text-purple-dark ring-purple-dark/15",
  red: "bg-red-50 text-red-700 ring-red-200"
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  action
}: {
  icon?: LucideIcon;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
      {Icon ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-atelier-lavender text-purple-dark">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      ) : null}
      <p className="text-sm font-medium text-atelier-muted">{title}</p>
      {action}
    </div>
  );
}

/** Placeholder rows while a list loads, so the empty state never flashes first. */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 w-1/4 animate-pulse rounded bg-atelier-border/70" />
          <div className="h-4 flex-1 animate-pulse rounded bg-atelier-border/50" />
          <div className="h-4 w-16 animate-pulse rounded bg-atelier-border/70" />
        </div>
      ))}
    </div>
  );
}

/** Small text action used inside table rows and cards. */
export function RowAction({
  danger,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
        danger ? "text-red-600 hover:bg-red-50" : "text-purple-dark hover:bg-atelier-lavender"
      } ${className ?? ""}`}
    />
  );
}

export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "gold" }) {
  return (
    <div className="rounded-2xl border border-atelier-border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-atelier-faint">{label}</p>
      <p className={`mt-2 font-cormorant text-3xl font-medium tabular-nums [overflow-wrap:anywhere] ${tone === "gold" ? "text-[#8A6420]" : "text-atelier-ink"}`}>
        {value}
      </p>
    </div>
  );
}

/** Row of filter chips, e.g. All · Pending · Confirmed. */
export function FilterChips<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition ${
              on
                ? "bg-atelier-ink text-white"
                : "bg-white text-atelier-muted ring-1 ring-inset ring-atelier-border hover:text-atelier-ink"
            }`}
          >
            {o.label}
            {o.count !== undefined ? (
              <span className={`tabular-nums text-xs ${on ? "text-white/60" : "text-atelier-faint"}`}>{o.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Search box with a magnifier icon. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atelier-faint"
      >
        <circle cx="9" cy="9" r="6" />
        <path d="m14 14 3.5 3.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xl border border-atelier-border bg-white py-2 pl-9 pr-3 text-sm text-atelier-ink outline-none transition placeholder:text-atelier-faint focus:border-purple-dark/40 focus:ring-2 focus:ring-purple-dark/10"
      />
    </label>
  );
}

/** Label/value line for detail views. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-atelier-faint">{label}</dt>
      <dd className="mt-1 text-sm text-atelier-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-green-dark" : "bg-atelier-border"
      }`}
    >
      <span
        aria-hidden
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`}
      />
    </button>
  );
}

/** A labelled switch row for forms. */
export function SwitchRow({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-atelier-border px-4 py-3">
      <span className="text-sm text-atelier-ink">{label}</span>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
