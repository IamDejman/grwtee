import * as React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  required?: boolean;
  /** Short text fixed inside the start of the field, e.g. a currency symbol. */
  adornment?: string;
};

export function Input({ label, error, required, adornment, id, className, ...props }: Props) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  return (
    <div>
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-dark">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </label>
      ) : null}
      <div className="relative mt-1">
        {adornment ? (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-dark/60">
            {adornment}
          </span>
        ) : null}
        <input
          id={inputId}
          className={[
            "w-full rounded-md border py-2 pr-3 outline-none transition",
            adornment ? "pl-8" : "pl-3",
            error ? "border-red-500 focus:border-red-600" : "border-gray-medium focus:border-green-dark",
            className || ""
          ].join(" ")}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}


