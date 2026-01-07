"use client";

import Link from "next/link";
import * as React from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-teal-dark text-white hover:bg-purple-medium shadow-md hover:shadow-lg",
  secondary:
    "bg-purple-medium text-white hover:bg-purple-dark shadow-md hover:shadow-lg",
  outline:
    "border border-teal-dark text-teal-dark hover:bg-teal-dark hover:text-white",
  ghost: "text-teal-dark hover:bg-teal-dark/10"
};

const sizeClass: Record<Size, string> = {
  sm: "px-6 py-2 text-sm",
  md: "px-8 py-3 text-base",
  lg: "px-10 py-3.5 text-lg"
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...props}
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full font-accent font-semibold tracking-wide transition",
        "active:scale-[0.98] hover:scale-[1.02]",
        "disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed",
        variantClass[variant],
        sizeClass[size],
        className || ""
      ].join(" ")}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          aria-hidden="true"
        />
      ) : null}
      {props.children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full font-accent font-semibold tracking-wide transition",
        "active:scale-[0.98] hover:scale-[1.02]",
        variantClass[variant],
        sizeClass[size],
        className || ""
      ].join(" ")}
      {...props}
    >
      {children}
    </Link>
  );
}


