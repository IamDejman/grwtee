"use client";

import { useEffect, useId, useState } from "react";
import { signOut } from "next-auth/react";
import { Eye, EyeOff, Laptop, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { adminFetch } from "@/lib/adminFetch";
import { useToast } from "@/components/admin/Toast";
import { Badge, Panel, RowAction, SkeletonRows } from "@/components/admin/ui";
import { validatePassword } from "@/lib/security/password-policy";

type SessionRow = {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  current?: boolean;
};

async function errorFrom(res: Response, fallback: string) {
  const json = (await res.json().catch(() => null)) as { error?: string } | null;
  return typeof json?.error === "string" ? json.error : fallback;
}

/** "Chrome on Mac" from a user-agent string, good enough to tell devices apart. */
function deviceName(ua: string | null): { label: string; phone: boolean } {
  if (!ua) return { label: "Unknown device", phone: false };
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return { label: os ? `${browser} on ${os}` : browser, phone: /iPhone|Android|Mobile/.test(ua) };
}

function PasswordInput({ label, value, onChange, autoComplete, error }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-dark">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full rounded-md border py-2 pl-3 pr-10 outline-none transition ${error ? "border-red-500" : "border-gray-medium focus:border-green-dark"}`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-dark/60 transition hover:bg-gray-medium/30 hover:text-gray-dark"
        >
          {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PasswordPanel() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const policy = validatePassword(next);
  const mismatch = confirmNext.length > 0 && confirmNext !== next;
  const ready = Boolean(current) && policy.ok && confirmNext === next;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next, confirmNewPassword: confirmNext })
      });
      if (!res.ok) throw new Error(await errorFrom(res, "Couldn't change your password. Try again."));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Couldn't change your password. Try again.");
      setBusy(false);
      return;
    }
    // Every device is signed out after a password change, including this one.
    try {
      await signOut({ callbackUrl: "/admin/login?reset=success" });
    } catch {
      window.location.assign("/admin/login?reset=success");
    }
  };

  return (
    <Panel title="Password">
      <form
        className="max-w-md space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) void submit();
        }}
      >
        <PasswordInput label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
        <div>
          <PasswordInput
            label="New password"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
            error={next && !policy.ok ? policy.message : undefined}
          />
          {!next ? (
            <p className="mt-1 text-xs text-atelier-faint">At least 12 characters, with upper and lower case letters, a number and a symbol.</p>
          ) : null}
        </div>
        <PasswordInput
          label="Type the new password again"
          value={confirmNext}
          onChange={setConfirmNext}
          autoComplete="new-password"
          error={mismatch ? "The passwords don't match." : undefined}
        />
        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" loading={busy} disabled={!ready}>
            Change password
          </Button>
          <span className="text-xs text-atelier-faint">You&apos;ll be signed out on every device.</span>
        </div>
      </form>
    </Panel>
  );
}

function TwoStepPanel({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  const toast = useToast();
  const [setup, setSetup] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [turningOff, setTurningOff] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSetup(null);
    setTurningOff(false);
    setPassword("");
    setCode("");
    setError(null);
  };

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/mfa");
      const json = (await res.json()) as { data?: { secret: string; qrDataUrl: string } };
      if (!res.ok || !json.data) throw new Error();
      setSetup({ secret: json.data.secret, qrDataUrl: json.data.qrDataUrl });
    } catch {
      toast.error("Couldn't start the setup. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/mfa", {
        method: turningOff ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(turningOff ? { currentPassword: password, code } : { secret: setup?.secret, code, currentPassword: password })
      });
      if (!res.ok) throw new Error(await errorFrom(res, "That didn't work. Check the code and try again."));
      onChange(!turningOff);
      toast.success(turningOff ? "Two-step sign-in is off." : "Two-step sign-in is on.");
      reset();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "That didn't work. Check the code and try again.");
    } finally {
      setBusy(false);
    }
  };

  const inProgress = setup !== null || turningOff;

  return (
    <Panel
      title="Two-step sign-in"
      actions={enabled ? <Badge tone="green">On</Badge> : <Badge>Off</Badge>}
    >
      <p className="text-sm text-atelier-muted">
        {enabled
          ? "Signing in needs your password and a 6-digit code from your authenticator app."
          : "Add a 6-digit code from an authenticator app (like Google Authenticator) to your sign-in, so a stolen password isn't enough."}
      </p>

      {!inProgress ? (
        <div className="mt-4">
          {enabled ? (
            <Button size="sm" variant="outline" onClick={() => setTurningOff(true)}>
              Turn off
            </Button>
          ) : (
            <Button size="sm" loading={busy} onClick={() => void start()}>
              Set up
            </Button>
          )}
        </div>
      ) : (
        <form
          className="mt-4 max-w-md space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void finish();
          }}
        >
          {setup ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setup.qrDataUrl} alt="QR code to scan with your authenticator app" width={160} height={160} className="h-40 w-40 shrink-0 rounded-xl border border-atelier-border" />
              <div className="text-sm text-atelier-muted">
                <p>1. Scan this code with your authenticator app.</p>
                <p className="mt-1">2. Enter the 6-digit code it shows, and your password.</p>
                <details className="mt-3">
                  <summary className="cursor-pointer text-purple-dark">Can&apos;t scan it?</summary>
                  <p className="mt-1">Type this key into the app instead:</p>
                  <code className="mt-1 block break-all rounded bg-atelier-canvas px-2 py-1 text-xs text-atelier-ink" translate="no">
                    {setup.secret}
                  </code>
                </details>
              </div>
            </div>
          ) : null}
          <Input
            label="6-digit code"
            autoFocus
            inputMode="numeric"
            spellCheck={false}
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <PasswordInput label="Your password" value={password} onChange={setPassword} autoComplete="current-password" />
          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant={turningOff ? "danger" : "primary"} loading={busy} disabled={code.length !== 6 || !password}>
              {turningOff ? "Turn off two-step sign-in" : "Turn on"}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={reset}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Panel>
  );
}

function DevicesPanel({ sessions, onRevoked }: { sessions: SessionRow[]; onRevoked: () => void }) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);

  const revoke = async (s: SessionRow) => {
    setBusyId(s.id);
    try {
      const res = await adminFetch(`/api/admin/sessions/${s.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Signed out of that device.");
      onRevoked();
    } catch {
      toast.error("Couldn't sign out that device. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const revokeAll = async () => {
    const ok = await confirm({
      title: "Sign out of every device?",
      body: "You'll be signed out here too and need to sign in again.",
      confirmLabel: "Sign out everywhere",
      danger: true
    });
    if (!ok) return;
    setBusyId("all");
    try {
      const res = await adminFetch("/api/admin/sessions/revoke-all", { method: "POST" });
      if (!res.ok) throw new Error();
      await signOut({ callbackUrl: "/admin/login?reason=session_expired" });
    } catch {
      toast.error("Couldn't sign out your devices. Try again.");
      setBusyId(null);
    }
  };

  return (
    <Panel
      title="Signed-in devices"
      actions={
        sessions.length > 1 ? (
          <Button size="sm" variant="outline" loading={busyId === "all"} onClick={() => void revokeAll()}>
            Sign out everywhere
          </Button>
        ) : null
      }
    >
      {dialog}
      <ul className="divide-y divide-atelier-border">
        {sessions.map((s) => {
          const device = deviceName(s.userAgent);
          const Icon = device.phone ? Smartphone : Laptop;
          return (
            <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-atelier-lavender text-purple-dark">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-atelier-ink">
                  {device.label}
                  {s.current ? <Badge tone="green">This device</Badge> : null}
                </p>
                <p className="truncate text-xs text-atelier-faint">
                  Signed in{" "}
                  {new Date(s.createdAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                    timeZone: "Africa/Lagos"
                  })}
                  {s.ip ? ` · ${s.ip}` : ""}
                </p>
              </div>
              {!s.current ? (
                <RowAction danger disabled={busyId !== null} onClick={() => void revoke(s)} aria-label={`Sign out ${device.label}`}>
                  Sign out
                </RowAction>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function AccountSettings() {
  const [data, setData] = useState<{ sessions: SessionRow[]; mfaEnabled: boolean } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const toast = useToast();

  // A failed refresh rethrows instead of replacing the panels, so an in-progress
  // two-step setup isn't lost.
  const load = async (refresh = false) => {
    if (!refresh) setLoadError(false);
    try {
      const res = await adminFetch("/api/admin/sessions");
      const json = (await res.json()) as { data?: SessionRow[]; mfaEnabled?: boolean };
      if (!res.ok) throw new Error();
      setData({ sessions: json.data ?? [], mfaEnabled: !!json.mfaEnabled });
    } catch (e: unknown) {
      if (refresh) throw e;
      setLoadError(true);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PasswordPanel />
      <div className="space-y-5">
        {loadError ? (
          <Panel>
            <p className="text-sm text-red-700" role="alert">
              Couldn&apos;t load your sign-in settings.{" "}
              <button type="button" onClick={() => void load()} className="font-medium underline underline-offset-2">
                Try again
              </button>
            </p>
          </Panel>
        ) : !data ? (
          <Panel>
            <SkeletonRows rows={4} />
          </Panel>
        ) : (
          <>
            <TwoStepPanel enabled={data.mfaEnabled} onChange={(mfaEnabled) => setData((d) => (d ? { ...d, mfaEnabled } : d))} />
            <DevicesPanel sessions={data.sessions} onRevoked={() => void load(true).catch(() => toast.error("Couldn't refresh your devices."))} />
          </>
        )}
      </div>
    </div>
  );
}
