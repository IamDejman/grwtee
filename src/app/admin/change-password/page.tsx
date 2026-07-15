"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { adminFetch } from "@/lib/adminFetch";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[0-9]/, "Include a number")
      .regex(/[^A-Za-z0-9]/, "Include a special character"),
    confirmNewPassword: z.string().min(12)
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"]
  });

type FormData = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors }
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const res = await adminFetch("/api/admin/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : "Unable to update password.");
        return;
      }
      await signOut({ callbackUrl: "/admin/login?reset=success" });
    } catch {
      setError("Network error. Try again.");
    }
  };

  return (
    <div className="pattern-light">
      <div className="container-shell flex min-h-[70vh] items-center justify-center py-16">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full max-w-md rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60"
        >
          <h1 className="font-heading text-2xl font-semibold text-purple-dark">
            Set a new password
          </h1>
          <p className="mt-2 text-sm text-gray-dark/70">
            Your account requires a stronger password before you can continue.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-dark" htmlFor="currentPassword">
                Current password
              </label>
              <input
                id="currentPassword"
                type="password"
                className="mt-1 w-full rounded-md border border-gray-medium px-3 py-2"
                {...register("currentPassword")}
              />
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-dark" htmlFor="newPassword">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                className="mt-1 w-full rounded-md border border-gray-medium px-3 py-2"
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-dark" htmlFor="confirmNewPassword">
                Confirm new password
              </label>
              <input
                id="confirmNewPassword"
                type="password"
                className="mt-1 w-full rounded-md border border-gray-medium px-3 py-2"
                {...register("confirmNewPassword")}
              />
              {errors.confirmNewPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmNewPassword.message}</p>
              )}
            </div>
          </div>

          {error ? (
            <p className="mt-3 text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-6">
            <Button type="submit" size="md" variant="primary" loading={isSubmitting} className="w-full">
              Update password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
