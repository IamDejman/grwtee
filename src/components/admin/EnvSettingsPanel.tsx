"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { adminFetch } from "@/lib/adminFetch";
import { useToast } from "@/components/admin/Toast";
import { Badge, Panel, SkeletonRows } from "@/components/admin/ui";
import { useUnsavedChanges } from "@/components/admin/useUnsavedChanges";

type EnvRow = {
  value: string;
  source: "database" | "environment";
};

const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: "Website",
    keys: [
      ["NEXT_PUBLIC_SITE_URL", "Website address"],
      ["NEXT_PUBLIC_CONTACT_EMAIL", "Public contact email"],
      ["NEXT_PUBLIC_INSTAGRAM_URL", "Instagram link"],
      ["NEXT_PUBLIC_GA_MEASUREMENT_ID", "Google Analytics ID"]
    ]
  },
  {
    title: "Email (Resend)",
    keys: [
      ["RESEND_API_KEY", "API key"],
      ["RESEND_FROM", "Send from address"],
      ["CONTACT_EMAIL", "Where enquiries are sent"]
    ]
  },
  {
    title: "Images (Cloudinary)",
    keys: [
      ["NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "Cloud name"],
      ["CLOUDINARY_API_KEY", "API key"],
      ["CLOUDINARY_API_SECRET", "API secret"]
    ]
  },
  {
    title: "Sign-in",
    keys: [
      ["NEXTAUTH_URL", "Sign-in address"],
      ["NEXTAUTH_SECRET", "Sign-in secret (changing it signs everyone out)"]
    ]
  }
];

async function apiError(res: Response, fallback: string) {
  const json = (await res.json().catch(() => null)) as { error?: string } | null;
  return typeof json?.error === "string" ? json.error : fallback;
}

export function EnvSettingsPanel() {
  const toast = useToast();
  const { askPassword, dialog } = useConfirm();
  const [rows, setRows] = useState<Record<string, EnvRow> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [reencrypting, setReencrypting] = useState(false);

  const load = async () => {
    setLoadError(false);
    try {
      const res = await adminFetch("/api/settings/env");
      const json = (await res.json()) as { data?: Record<string, EnvRow> };
      if (!res.ok) throw new Error();
      setRows(json.data ?? {});
    } catch {
      setLoadError(true);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const changes = Object.entries(draft)
    .filter(([, value]) => value.trim() !== "")
    .map(([key, value]) => ({ key, value: value.trim() }));

  useUnsavedChanges(changes.length > 0);

  const save = async () => {
    const currentPassword = await askPassword({
      title: `Save ${changes.length} ${changes.length === 1 ? "change" : "changes"}?`,
      body: "The site starts using new values straight away.",
      confirmLabel: "Save"
    });
    if (!currentPassword) return;
    setSaving(true);
    try {
      const res = await adminFetch("/api/settings/env", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vars: changes, currentPassword })
      });
      if (!res.ok) throw new Error(await apiError(res, "Couldn't save. Try again."));
      setDraft({});
      toast.success("Connections saved.");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const reencrypt = async () => {
    const currentPassword = await askPassword({
      title: "Re-encrypt payment details?",
      body: "Stored bank and payment details are encrypted again with the current key. Only needed after the encryption key changes.",
      confirmLabel: "Re-encrypt"
    });
    if (!currentPassword) return;
    setReencrypting(true);
    try {
      const res = await adminFetch("/api/payment-accounts/re-encrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword })
      });
      const json = (await res.json().catch(() => null)) as { error?: string; data?: { updated?: number; skipped?: number } } | null;
      if (!res.ok) throw new Error(json?.error || "Couldn't re-encrypt. Try again.");
      const updated = json?.data?.updated ?? 0;
      toast.success(updated ? `Re-encrypted ${updated} ${updated === 1 ? "account" : "accounts"}.` : "Everything was already up to date.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Couldn't re-encrypt. Try again.");
    } finally {
      setReencrypting(false);
    }
  };

  return (
    <div className="space-y-5">
      {dialog}
      <p className="rounded-xl bg-gold/10 px-4 py-3 text-sm text-[#8A6420]">
        These connect the site to email, image storage and analytics. A wrong value can stop emails or uploads working, so only
        change them if you know the new value is right.
      </p>

      <Panel
        title="Connections"
        actions={
          changes.length ? (
            <>
              <Button size="sm" variant="ghost" disabled={saving} onClick={() => setDraft({})}>
                Discard
              </Button>
              <Button size="sm" loading={saving} onClick={() => void save()}>
                Save {changes.length === 1 ? "change" : `${changes.length} changes`}
              </Button>
            </>
          ) : null
        }
      >
        {loadError ? (
          <p className="text-sm text-red-700" role="alert">
            Couldn&apos;t load these settings.{" "}
            <button type="button" onClick={() => void load()} className="font-medium underline underline-offset-2">
              Try again
            </button>
          </p>
        ) : !rows ? (
          <SkeletonRows rows={6} />
        ) : (
          <div className="space-y-6">
            {GROUPS.map((group) => (
              <section key={group.title}>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-atelier-faint">{group.title}</h3>
                <ul className="divide-y divide-atelier-border rounded-xl border border-atelier-border">
                  {group.keys.map(([key, label]) => {
                    const configured = rows[key]?.value === "[configured]";
                    return (
                      <li key={key} className="grid gap-2 p-3 md:grid-cols-[minmax(0,1fr)_16rem] md:items-center">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-atelier-ink">
                            {label}
                            {configured ? <Badge tone="green">Set</Badge> : <Badge tone="gold">Not set</Badge>}
                          </p>
                          <p className="truncate font-mono text-xs text-atelier-faint" translate="no">
                            {key}
                          </p>
                        </div>
                        <input
                          type="password"
                          name={key}
                          autoComplete="new-password"
                          spellCheck={false}
                          aria-label={`New value for ${label}`}
                          placeholder={configured ? "Replace with a new value…" : "Add a value…"}
                          value={draft[key] ?? ""}
                          onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="w-full rounded-md border border-gray-medium px-3 py-2 text-sm outline-none transition focus:border-green-dark"
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Payment details encryption">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-atelier-muted">Only needed if you or your developer changed the encryption key.</p>
          <Button size="sm" variant="outline" loading={reencrypting} onClick={() => void reencrypt()}>
            Re-encrypt payment details
          </Button>
        </div>
      </Panel>
    </div>
  );
}
