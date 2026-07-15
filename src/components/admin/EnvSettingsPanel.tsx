"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { adminFetch } from "@/lib/adminFetch";

type EnvRow = {
  value: string;
  source: "database" | "environment";
};

const ENV_LABELS: Record<string, string> = {
  NEXTAUTH_SECRET: "NextAuth secret",
  NEXTAUTH_URL: "NextAuth URL",
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "Cloudinary cloud name",
  CLOUDINARY_API_KEY: "Cloudinary API key",
  CLOUDINARY_API_SECRET: "Cloudinary API secret",
  RESEND_API_KEY: "Resend API key",
  RESEND_FROM: "Resend from address",
  CONTACT_EMAIL: "Contact email (server)",
  NEXT_PUBLIC_SITE_URL: "Public site URL",
  NEXT_PUBLIC_INSTAGRAM_URL: "Instagram URL",
  NEXT_PUBLIC_CONTACT_EMAIL: "Public contact email",
  NEXT_PUBLIC_GA_MEASUREMENT_ID: "Google Analytics ID"
};

export function EnvSettingsPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, EnvRow>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [currentPassword, setCurrentPassword] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/settings/env");
      const json = await res.json();
      if (!res.ok) throw new Error("Failed");
      setRows(json.data || {});
    } catch {
      setError("Failed to load integration settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    const vars = Object.entries(draft)
      .filter(([, value]) => value.trim() !== "")
      .map(([key, value]) => ({ key, value: value.trim() }));

    if (!vars.length) {
      setError("Enter at least one new value to save.");
      return;
    }
    if (!currentPassword) {
      setError("Enter your current password to confirm changes.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminFetch("/api/settings/env", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vars, currentPassword })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setDraft({});
      setCurrentPassword("");
      setSuccess("Integration settings updated.");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save integration settings.");
    } finally {
      setLoading(false);
    }
  };

  const keys = Object.keys(ENV_LABELS);

  return (
    <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60 lg:col-span-2">
      <h2 className="font-heading text-xl font-semibold text-purple-dark">
        Integration settings
      </h2>
      <p className="mt-2 text-sm text-gray-dark/80">
        Store API keys in the database when Vercel env vars are unavailable. Values are
        never shown after saving — enter a new value to replace. Requires your current
        password.
      </p>

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-3 text-sm text-green-dark" role="status">
          {success}
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-medium/60 text-left text-xs font-semibold uppercase tracking-wider text-gray-dark/70">
              <th className="py-2 pr-4">Setting</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">New value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-medium/40">
            {keys.map((key) => {
              const row = rows[key];
              const configured = row?.value === "[configured]";
              return (
                <tr key={key}>
                  <td className="py-3 pr-4 align-top">
                    <p className="font-semibold text-gray-dark">{ENV_LABELS[key]}</p>
                    <p className="mt-0.5 font-mono text-xs text-gray-dark/60">{key}</p>
                  </td>
                  <td className="py-3 pr-4 align-top">
                    {configured ? (
                      <span className="rounded-full bg-green-dark/10 px-2 py-1 text-xs font-semibold text-green-dark">
                        {row.source === "database" ? "DB" : "Env"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-gold/20 px-2 py-1 text-xs font-semibold text-gray-dark">
                        Not set
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <input
                      type="password"
                      autoComplete="off"
                      placeholder={configured ? "Enter new value to replace" : "Set value"}
                      value={draft[key] || ""}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="w-full min-w-[220px] rounded-md border border-gray-medium px-3 py-2"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 max-w-md">
        <label className="block text-sm font-semibold text-gray-dark" htmlFor="env-current-password">
          Current password
        </label>
        <input
          id="env-current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-medium px-3 py-2"
        />
      </div>

      <div className="mt-4 flex gap-3">
        <Button variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
        <Button onClick={save} loading={loading}>
          Save integration settings
        </Button>
      </div>
    </div>
  );
}
