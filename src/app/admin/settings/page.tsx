"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

type Settings = {
  siteTitle: string;
  instagramUrl: string;
  contactEmail: string;
  businessHours: string;
  adminEmailNotifications: boolean;
};

type EnvVar = {
  key: string;
  value: string;
  source: "database" | "environment";
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [envVars, setEnvVars] = useState<Record<string, EnvVar> | null>(null);
  const [showEnvVars, setShowEnvVars] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (!res.ok) throw new Error("Failed");
      setSettings(json.data);
    } catch {
      setError("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  const loadEnvVars = async () => {
    try {
      const res = await fetch("/api/settings/env");
      const json = await res.json();
      if (!res.ok) throw new Error("Failed");
      setEnvVars(json.data);
    } catch {
      // Silent fail for env vars
    }
  };

  const saveEnvVars = async () => {
    if (!envVars) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const vars = Object.entries(envVars).map(([key, item]) => ({
        key,
        value: item.value
      }));
      const res = await fetch("/api/settings/env", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vars })
      });
      if (!res.ok) throw new Error("Failed");
      setSuccess("Environment variables saved to database.");
      await loadEnvVars();
    } catch {
      setError("Failed to save environment variables.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void loadEnvVars();
  }, []);

  const save = async () => {
    if (!settings) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error("Failed");
      setSuccess("Settings saved.");
    } catch {
      setError("Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setCurrentPassword("");
      setNewPassword("");
      setSuccess("Password updated.");
    } catch (e: any) {
      setError(typeof e?.message === "string" ? e.message : "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-purple-dark">
            Settings
          </h1>
          <p className="mt-2 text-sm text-gray-dark/80">
            Update site metadata, contact info, business hours, and admin profile.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
          <Button onClick={save} loading={loading} disabled={!settings}>
            Save
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 text-sm font-semibold text-green-700" role="status">
          {success}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
          <h2 className="font-heading text-xl font-semibold text-purple-dark">
            Site Settings
          </h2>
          <div className="mt-4 space-y-4">
            <Input
              label="Site title"
              value={settings?.siteTitle || ""}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, siteTitle: e.target.value } : s))
              }
            />
            <Input
              label="Instagram URL"
              value={settings?.instagramUrl || ""}
              onChange={(e) =>
                setSettings((s) =>
                  s ? { ...s, instagramUrl: e.target.value } : s
                )
              }
            />
            <Input
              label="Contact email"
              value={settings?.contactEmail || ""}
              onChange={(e) =>
                setSettings((s) =>
                  s ? { ...s, contactEmail: e.target.value } : s
                )
              }
            />
            <Textarea
              label="Business hours"
              rows={6}
              value={settings?.businessHours || ""}
              onChange={(e) =>
                setSettings((s) =>
                  s ? { ...s, businessHours: e.target.value } : s
                )
              }
            />
            <label className="inline-flex items-center gap-2 text-sm text-gray-dark/80">
              <input
                type="checkbox"
                checked={!!settings?.adminEmailNotifications}
                onChange={(e) =>
                  setSettings((s) =>
                    s ? { ...s, adminEmailNotifications: e.target.checked } : s
                  )
                }
                className="h-4 w-4 rounded border-gray-medium"
              />
              Admin email notifications
            </label>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
          <h2 className="font-heading text-xl font-semibold text-purple-dark">
            Admin Profile
          </h2>
          <p className="mt-2 text-sm text-gray-dark/80">
            Change password (recommended after initial seed).
          </p>
          <div className="mt-4 space-y-4">
            <Input
              type="password"
              label="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              type="password"
              label="New password (min 8 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={changePassword}
              loading={loading}
              disabled={!currentPassword || newPassword.length < 8}
            >
              Update Password
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold text-purple-dark">
              Environment Variables
            </h2>
            <p className="mt-2 text-sm text-gray-dark/80">
              Manage configuration values in the database. Values in database take precedence over environment variables.
              <br />
              <span className="text-xs text-gray-dark/60">
                Note: DATABASE_URL must remain as an environment variable in Vercel.
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setShowEnvVars(!showEnvVars); void loadEnvVars(); }}>
              {showEnvVars ? "Hide" : "Show"} Env Vars
            </Button>
            {showEnvVars && (
              <Button onClick={saveEnvVars} loading={loading} disabled={!envVars}>
                Save Env Vars
              </Button>
            )}
          </div>
        </div>

        {showEnvVars && envVars && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(envVars).map(([key, item]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-dark/80">
                    {key}
                  </label>
                  <span
                    className={`text-xs rounded px-1.5 py-0.5 ${
                      item.source === "database"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {item.source === "database" ? "DB" : "ENV"}
                  </span>
                </div>
                <Input
                  type={key.includes("SECRET") || key.includes("PASSWORD") || key.includes("KEY") ? "password" : "text"}
                  value={item.value}
                  onChange={(e) =>
                    setEnvVars((prev) =>
                      prev
                        ? {
                            ...prev,
                            [key]: { ...item, value: e.target.value, source: "database" as const }
                          }
                        : null
                    )
                  }
                  placeholder={item.source === "environment" ? `Using env var: ${process.env[key] ? "***" : "not set"}` : ""}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


