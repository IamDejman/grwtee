"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";

const requestSchema = z.object({
  email: z.string().email("Enter a valid email address")
});

const resetSchema = z
  .object({
    otp: z.string().length(6, "Enter the 6-digit code"),
    newPassword: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[0-9]/, "Include a number")
      .regex(/[^A-Za-z0-9]/, "Include a special character"),
    confirmPassword: z.string().min(12, "Confirm your password")
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

type RequestFormData = z.infer<typeof requestSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const requestForm = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: "book@grwtee.com" }
  });

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: "", newPassword: "", confirmPassword: "" }
  });

  const onRequestSubmit = async (data: RequestFormData) => {
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email.trim().toLowerCase() })
      });
      const json = await res.json();

      if (!res.ok) {
        setError("If the details provided are correct, further instructions will be sent.");
        return;
      }

      setEmail(data.email.trim().toLowerCase());
      setResetToken(typeof json.resetToken === "string" ? json.resetToken : "");
      setSuccessMsg("If the details provided are correct, further instructions will be sent.");
      setStep("reset");
      resetForm.reset({ otp: "", newPassword: "", confirmPassword: "" });
    } catch {
      setError("If the details provided are correct, further instructions will be sent.");
    }
  };

  const onResetSubmit = async (data: ResetFormData) => {
    setError(null);
    if (!resetToken) {
      setError("If the details provided are correct, further instructions will be sent.");
      return;
    }
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          resetToken,
          otp: data.otp.trim(),
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword
        })
      });

      if (!res.ok) {
        setError("If the details provided are correct, further instructions will be sent.");
        return;
      }

      router.replace("/admin/login?reset=success");
    } catch {
      setError("If the details provided are correct, further instructions will be sent.");
    }
  };

  return (
    <div className="pattern-light">
      <div className="container-shell flex min-h-[70vh] items-center justify-center py-16">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
          <h1 className="font-heading text-2xl font-semibold text-purple-dark">
            Forgot password
          </h1>
          <p className="mt-1 text-sm text-gray-dark/70">
            {step === "request"
              ? "Enter your admin email and we’ll send you a one-time code."
              : "Enter the 6-digit code from your email and choose a new password."}
          </p>

          {step === "request" ? (
            <form
              onSubmit={requestForm.handleSubmit(onRequestSubmit)}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-dark" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  className="mt-1 w-full rounded-md border border-gray-medium px-3 py-2 outline-none ring-0 transition focus:border-green-dark"
                  placeholder="book@grwtee.com"
                  {...requestForm.register("email")}
                />
                {requestForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {requestForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              {error && (
                <p className="text-sm font-medium text-red-600" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                size="md"
                variant="primary"
                loading={requestForm.formState.isSubmitting}
                className="w-full"
              >
                Send code
              </Button>
            </form>
          ) : (
            <form
              onSubmit={resetForm.handleSubmit(onResetSubmit)}
              className="mt-6 space-y-4"
            >
              {successMsg && (
                <p className="rounded-md bg-green-dark/10 px-3 py-2 text-sm text-green-dark">
                  {successMsg}
                </p>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-dark" htmlFor="otp">
                  6-digit code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="mt-1 w-full rounded-md border border-gray-medium px-3 py-2 text-center text-lg tracking-[0.4em] outline-none ring-0 transition focus:border-green-dark"
                  placeholder="000000"
                  {...resetForm.register("otp")}
                />
                {resetForm.formState.errors.otp && (
                  <p className="mt-1 text-sm text-red-600">
                    {resetForm.formState.errors.otp.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-dark" htmlFor="newPassword">
                  New password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  className="mt-1 w-full rounded-md border border-gray-medium px-3 py-2 outline-none ring-0 transition focus:border-green-dark"
                  placeholder="••••••••"
                  {...resetForm.register("newPassword")}
                />
                {resetForm.formState.errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {resetForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-dark" htmlFor="confirmPassword">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="mt-1 w-full rounded-md border border-gray-medium px-3 py-2 outline-none ring-0 transition focus:border-green-dark"
                  placeholder="••••••••"
                  {...resetForm.register("confirmPassword")}
                />
                {resetForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {resetForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              {error && (
                <p className="text-sm font-medium text-red-600" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                size="md"
                variant="primary"
                loading={resetForm.formState.isSubmitting}
                className="w-full"
              >
                Reset password
              </Button>
              <button
                type="button"
                onClick={() => { setStep("request"); setError(null); setSuccessMsg(null); setResetToken(""); }}
                className="w-full text-center text-sm font-semibold text-green-dark hover:text-purple-dark"
              >
                Use a different email
              </button>
            </form>
          )}

          <p className="mt-6 text-center">
            <Link
              href="/admin/login"
              className="text-sm font-semibold text-green-dark hover:text-purple-dark"
            >
              ← Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
