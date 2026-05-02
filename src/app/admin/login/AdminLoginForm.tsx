"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  remember: z.boolean().optional()
});

type FormData = z.infer<typeof schema>;

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      setSuccessMsg("Password updated. You can sign in with your new password.");
    } else if (searchParams.get("reason") === "session_expired") {
      setError("Your session has expired. Please sign in again.");
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: "book@grwtee.com" } });

  const onSubmit = async (data: FormData) => {
    setError(null);
    const res = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password
    });
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.replace("/admin/dashboard");
  };

  return (
    <div className="pattern-light">
      <div className="container-shell flex min-h-[70vh] items-center justify-center py-16">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full max-w-md rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60"
        >
          <h1 className="font-heading text-2xl font-semibold text-purple-dark">
            Admin Login
          </h1>
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-dark" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="mt-1 w-full rounded-md border border-gray-medium px-3 py-2 outline-none ring-0 transition focus:border-green-dark"
                placeholder="book@grwtee.com"
                {...register("email")}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-dark" htmlFor="password">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-md border border-gray-medium px-3 py-2 pr-10 outline-none ring-0 transition focus:border-green-dark"
                  placeholder="••••••••"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-dark/70 transition hover:bg-gray-medium/30 hover:text-gray-dark"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-medium" {...register("remember")} />
                <span className="text-sm text-gray-dark/80">Remember me</span>
              </label>
              <Link
                href="/admin/forgot-password"
                className="text-sm font-semibold text-green-dark hover:text-purple-dark"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {successMsg ? (
            <p className="mt-3 rounded-md bg-green-dark/10 px-3 py-2 text-sm text-green-dark" role="status">
              {successMsg}
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-6">
            <Button type="submit" size="md" variant="primary" loading={isSubmitting} className="w-full">
              Sign In
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
