"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function AdminSignOutButton({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        tone === "dark"
          ? "text-atelier-nav-text hover:bg-white/5 hover:text-white"
          : "bg-white text-atelier-ink ring-1 ring-atelier-border hover:bg-atelier-lavender"
      }`}
    >
      <LogOut className="h-4 w-4 shrink-0 opacity-70" strokeWidth={1.75} aria-hidden="true" />
      Sign out
    </button>
  );
}


