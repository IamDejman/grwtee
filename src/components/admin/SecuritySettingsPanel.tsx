"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { adminFetch } from "@/lib/adminFetch";
import { signOut } from "next-auth/react";

type SessionRow = {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  current?: boolean;
};

export function SecuritySettingsPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [setupSecret, setSetupSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [stepUpPassword, setStepUpPassword] = useState("");

  const loadSessions = async () => {
    const res = await adminFetch("/api/admin/sessions");
    const json = await res.json();
    if (res.ok) setSessions(json.data || []);
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  const startMfaSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/mfa");
      const json = await res.json();
      if (!res.ok) throw new Error("Failed");
      setSetupSecret(json.data.secret);
      setQrDataUrl(json.data.qrDataUrl);
      setMfaEnabled(json.data.mfaEnabled);
    } catch {
      setError("Failed to start MFA setup.");
    } finally {
      setLoading(false);
    }
  };

  const enableMfa = async () => {
    if (!setupSecret || !stepUpPassword || !totpCode) {
      setError("Enter current password and authenticator code.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: setupSecret,
          code: totpCode,
          currentPassword: stepUpPassword
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setMfaEnabled(true);
      setSuccess("Authenticator MFA enabled.");
      setTotpCode("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to enable MFA.");
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/mfa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: stepUpPassword, code: totpCode })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setMfaEnabled(false);
      setSuccess("MFA disabled.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to disable MFA.");
    } finally {
      setLoading(false);
    }
  };

  const revokeAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/sessions/revoke-all", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      await signOut({ callbackUrl: "/admin/login?reason=session_expired" });
    } catch {
      setError("Failed to revoke sessions.");
      setLoading(false);
    }
  };

  const revokeSession = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setSuccess("Session revoked.");
      await loadSessions();
    } catch {
      setError("Failed to revoke session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10 rounded-xl border border-gray-medium/60 bg-white p-6">
      <h2 className="font-heading text-xl font-semibold text-purple-dark">Security</h2>
      <p className="mt-2 text-sm text-gray-dark/80">
        Multi-factor authentication, active sessions, and sign-out controls.
      </p>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-green-dark">{success}</p> : null}

      <div className="mt-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-dark">Authenticator app (TOTP)</h3>
          <p className="mt-1 text-sm text-gray-dark/70">
            Status: {mfaEnabled ? "Enabled" : "Disabled"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={startMfaSetup} loading={loading}>
              {mfaEnabled ? "Rotate MFA setup" : "Set up MFA"}
            </Button>
            {mfaEnabled ? (
              <Button size="sm" variant="outline" onClick={disableMfa} loading={loading}>
                Disable MFA
              </Button>
            ) : (
              <Button size="sm" variant="primary" onClick={enableMfa} loading={loading}>
                Enable MFA
              </Button>
            )}
          </div>
          {qrDataUrl ? (
            <div className="mt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="MFA QR code" className="h-40 w-40 rounded border" />
            </div>
          ) : null}
          <input
            type="password"
            placeholder="Current password (required)"
            value={stepUpPassword}
            onChange={(e) => setStepUpPassword(e.target.value)}
            className="mt-3 w-full max-w-md rounded-md border border-gray-medium px-3 py-2"
          />
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit authenticator code"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            className="mt-2 w-full max-w-md rounded-md border border-gray-medium px-3 py-2"
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-dark">Active sessions</h3>
          <ul className="mt-2 space-y-2 text-sm text-gray-dark/80">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded border border-gray-medium/40 px-3 py-2">
                <span>
                  {s.current ? "(This device) " : ""}
                  {s.ip || "Unknown IP"} · {new Date(s.createdAt).toLocaleString()}
                </span>
                {!s.current ? (
                  <Button size="sm" variant="outline" onClick={() => revokeSession(s.id)} loading={loading}>
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          <Button className="mt-3" size="sm" variant="outline" onClick={revokeAll} loading={loading}>
            Sign out all devices
          </Button>
        </div>
      </div>
    </div>
  );
}
