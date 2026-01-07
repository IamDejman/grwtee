"use client";

import { signOut } from "next-auth/react";

export function AdminSignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="mt-4 w-full rounded-md bg-white/60 px-3 py-2 text-left text-sm font-semibold text-gray-dark hover:bg-white"
    >
      Sign out
    </button>
  );
}


