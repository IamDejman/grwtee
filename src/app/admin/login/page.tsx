import { Suspense } from "react";
import { AdminLoginForm } from "./AdminLoginForm";

function LoginFallback() {
  return (
    <div className="pattern-light">
      <div className="container-shell flex min-h-[70vh] items-center justify-center py-16">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-medium/40" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-medium/30" />
          <div className="mt-6 space-y-4">
            <div className="h-10 animate-pulse rounded bg-gray-medium/20" />
            <div className="h-10 animate-pulse rounded bg-gray-medium/20" />
            <div className="h-10 animate-pulse rounded bg-gray-medium/30" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <AdminLoginForm />
    </Suspense>
  );
}
