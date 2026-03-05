import * as React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  required?: boolean;
};

export function Input({ label, error, required, id, className, ...props }: Props) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  return (
    <div>
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-dark">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </label>
      ) : null}
      <input
        id={inputId}
        className={[
          "mt-1 w-full rounded-md border px-3 py-2 outline-none transition",
          error ? "border-red-500 focus:border-red-600" : "border-gray-medium focus:border-green-dark",
          className || ""
        ].join(" ")}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}


