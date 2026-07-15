"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { PaymentAccountsManager } from "@/components/admin/PaymentAccountsManager";
import { SecuritySettingsPanel } from "@/components/admin/SecuritySettingsPanel";
import { EnvSettingsPanel } from "@/components/admin/EnvSettingsPanel";
import { adminFetch } from "@/lib/adminFetch";
import { validatePassword } from "@/lib/security/password-policy";

type Settings = {
  siteTitle: string;
  instagramUrl: string;
  contactEmail: string;
  businessHours: string;
  adminEmailNotifications: boolean;
  invoiceBusinessName: string;
  invoiceBusinessAddress: string;
  invoiceVatNumber: string;
  invoiceFooterTerms: string;
};

const DEFAULT_SETTINGS: Settings = {
  siteTitle: "",
  instagramUrl: "",
  contactEmail: "",
  businessHours: "",
  adminEmailNotifications: true,
  invoiceBusinessName: "",
  invoiceBusinessAddress: "",
  invoiceVatNumber: "",
  invoiceFooterTerms: ""
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminFetch("/api/settings");
      const json = await res.json();
      if (!res.ok) throw new Error("Failed");
      setSettings({ ...DEFAULT_SETTINGS, ...json.data });
    } catch {
      setError("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminFetch("/api/settings", {
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
    if (newPassword !== confirmNewPassword) {
      setError("New password and confirm password do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminFetch("/api/admin/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setSuccess("Password updated. Signing you out on all devices...");
      await signOut({ callbackUrl: "/admin/login?reset=success" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = validatePassword(newPassword);
  const passwordReady =
    Boolean(currentPassword) &&
    passwordValidation.ok &&
    confirmNewPassword.length >= 12 &&
    newPassword === confirmNewPassword;

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
          <Button onClick={save} loading={loading}>
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
              value={settings.siteTitle}
              onChange={(e) =>
                setSettings((s) => ({ ...s, siteTitle: e.target.value }))
              }
            />
            <Input
              label="Instagram URL"
              value={settings.instagramUrl}
              onChange={(e) =>
                setSettings((s) => ({ ...s, instagramUrl: e.target.value }))
              }
            />
            <Input
              label="Contact email"
              value={settings.contactEmail}
              onChange={(e) =>
                setSettings((s) => ({ ...s, contactEmail: e.target.value }))
              }
            />
            <Textarea
              label="Business hours"
              rows={6}
              value={settings.businessHours}
              onChange={(e) =>
                setSettings((s) => ({ ...s, businessHours: e.target.value }))
              }
            />
            <label className="inline-flex items-center gap-2 text-sm text-gray-dark/80">
              <input
                type="checkbox"
                checked={settings.adminEmailNotifications}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    adminEmailNotifications: e.target.checked
                  }))
                }
                className="h-4 w-4 rounded border-gray-medium"
              />
              Admin email notifications
            </label>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
          <h2 className="font-heading text-xl font-semibold text-purple-dark">
            Invoice Branding
          </h2>
          <p className="mt-2 text-sm text-gray-dark/80">
            Business info printed on every invoice PDF. The logo comes from{" "}
            <code className="rounded bg-cream-light px-1 text-xs">/public/logo.png</code>.
          </p>
          <div className="mt-4 space-y-4">
            <Input
              label="Business name"
              placeholder="GRWTEE"
              value={settings.invoiceBusinessName}
              onChange={(e) =>
                setSettings((s) => ({ ...s, invoiceBusinessName: e.target.value }))
              }
            />
            <Textarea
              label="Business address"
              rows={3}
              placeholder={"123 Main Street\nLagos, Nigeria"}
              value={settings.invoiceBusinessAddress}
              onChange={(e) =>
                setSettings((s) => ({ ...s, invoiceBusinessAddress: e.target.value }))
              }
            />
            <Input
              label="VAT / Tax number"
              placeholder="e.g. 123456789"
              value={settings.invoiceVatNumber}
              onChange={(e) =>
                setSettings((s) => ({ ...s, invoiceVatNumber: e.target.value }))
              }
            />
            <Textarea
              label="Invoice footer terms"
              rows={4}
              placeholder={"Please quote the invoice number on all payments.\nNo refunds or exchanges on couture or special orders."}
              value={settings.invoiceFooterTerms}
              onChange={(e) =>
                setSettings((s) => ({ ...s, invoiceFooterTerms: e.target.value }))
              }
            />
            <p className="text-xs text-gray-dark/70">
              These appear at the bottom of every invoice PDF.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60 lg:col-span-2">
          <PaymentAccountsManager />
        </div>

        <EnvSettingsPanel />

        <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
          <h2 className="font-heading text-xl font-semibold text-purple-dark">
            Admin Profile
          </h2>
          <p className="mt-2 text-sm text-gray-dark/80">
            Change password (recommended after initial seed).
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-dark" htmlFor="current-password">
                Current password
              </label>
              <div className="relative mt-1">
                <input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-medium px-3 py-2 pr-10 outline-none ring-0 transition focus:border-green-dark"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-dark/70 transition hover:bg-gray-medium/30 hover:text-gray-dark"
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? (
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
            <div>
              <label className="block text-sm font-semibold text-gray-dark" htmlFor="new-password">
                New password (min 12 chars, mixed case, number, symbol)
              </label>
              <div className="relative mt-1">
                <input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-medium px-3 py-2 pr-10 outline-none ring-0 transition focus:border-green-dark"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-dark/70 transition hover:bg-gray-medium/30 hover:text-gray-dark"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
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
            <div>
              <label className="block text-sm font-semibold text-gray-dark" htmlFor="confirm-new-password">
                Confirm new password
              </label>
              <div className="relative mt-1">
                <input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-medium px-3 py-2 pr-10 outline-none ring-0 transition focus:border-green-dark"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-dark/70 transition hover:bg-gray-medium/30 hover:text-gray-dark"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
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
            {!passwordValidation.ok && newPassword.length > 0 ? (
              <p className="text-sm text-red-600" role="alert">
                {!passwordValidation.ok ? passwordValidation.message : null}
              </p>
            ) : null}
            <Button
              variant="secondary"
              onClick={changePassword}
              loading={loading}
              disabled={!passwordReady}
            >
              Update Password
            </Button>
          </div>
        </div>
      </div>

      <SecuritySettingsPanel />
    </div>
  );
}


