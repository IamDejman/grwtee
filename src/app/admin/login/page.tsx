"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: "admin@grwtee.com" } });

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
          <p className="mt-1 text-sm text-gray-dark/70">
            Enter your credentials to access the admin panel.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-dark" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="mt-1 w-full rounded-md border border-gray-medium px-3 py-2 outline-none ring-0 transition focus:border-teal-dark"
                placeholder="admin@grwtee.com"
                {...register("email")}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-dark" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="mt-1 w-full rounded-md border border-gray-medium px-3 py-2 outline-none ring-0 transition focus:border-teal-dark"
                placeholder="••••••••"
                {...register("password")}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-medium" {...register("remember")} />
                <span className="text-sm text-gray-dark/80">Remember me</span>
              </label>
              <a
                className="text-sm font-semibold text-teal-dark hover:text-purple-dark"
                href="mailto:grwteee@gmail.com?subject=GRWTEE%20Admin%20Password%20Reset"
              >
                Forgot password?
              </a>
            </div>
          </div>

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


