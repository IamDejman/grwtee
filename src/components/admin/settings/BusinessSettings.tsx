"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { adminFetch } from "@/lib/adminFetch";
import { useToast } from "@/components/admin/Toast";
import { Panel, SkeletonRows, SwitchRow } from "@/components/admin/ui";
import { useUnsavedChanges } from "@/components/admin/useUnsavedChanges";

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

const EMPTY: Settings = {
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

export function BusinessSettings() {
  const toast = useToast();
  const [saved, setSaved] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings>(EMPTY);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoadError(false);
    try {
      const res = await adminFetch("/api/settings");
      const json = (await res.json()) as { data?: Partial<Settings> };
      if (!res.ok) throw new Error();
      const next = { ...EMPTY, ...json.data };
      setSaved(next);
      setDraft(next);
    } catch {
      setLoadError(true);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const dirty = saved !== null && JSON.stringify(saved) !== JSON.stringify(draft);

  useUnsavedChanges(dirty);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      if (!res.ok) throw new Error();
      setSaved(draft);
      toast.success("Settings saved.");
    } catch {
      toast.error("Couldn't save settings. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <Panel>
        <p className="text-sm text-red-700" role="alert">
          Couldn&apos;t load your settings.{" "}
          <button type="button" onClick={() => void load()} className="font-medium underline underline-offset-2">
            Try again
          </button>
        </p>
      </Panel>
    );
  }

  if (!saved) {
    return (
      <Panel>
        <SkeletonRows rows={6} />
      </Panel>
    );
  }

  return (
    <div className="space-y-5 pb-20">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Website">
          <div className="space-y-4">
            <Input label="Site name" value={draft.siteTitle} onChange={(e) => set("siteTitle", e.target.value)} />
            <Input
              label="Contact email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              value={draft.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
              placeholder="book@grwtee.com"
            />
            <Input
              label="Instagram link"
              type="url"
              spellCheck={false}
              value={draft.instagramUrl}
              onChange={(e) => set("instagramUrl", e.target.value)}
              placeholder="https://instagram.com/…"
            />
            <Textarea
              label="Opening hours"
              rows={5}
              value={draft.businessHours}
              onChange={(e) => set("businessHours", e.target.value)}
              placeholder={"Mon - Fri: 9am - 6pm\nSat: by appointment"}
            />
          </div>
        </Panel>

        <Panel title="Invoices">
          <div className="space-y-4">
            <p className="text-sm text-atelier-muted">Shown at the top and bottom of every invoice you send.</p>
            <Input
              label="Business name"
              placeholder="GRWTEE"
              value={draft.invoiceBusinessName}
              onChange={(e) => set("invoiceBusinessName", e.target.value)}
            />
            <Textarea
              label="Business address"
              rows={3}
              placeholder={"Street address\nLagos, Nigeria"}
              value={draft.invoiceBusinessAddress}
              onChange={(e) => set("invoiceBusinessAddress", e.target.value)}
            />
            <Input label="VAT or tax number" value={draft.invoiceVatNumber} onChange={(e) => set("invoiceVatNumber", e.target.value)} />
            <Textarea
              label="Terms at the bottom"
              rows={4}
              placeholder="Please quote the invoice number when you pay."
              value={draft.invoiceFooterTerms}
              onChange={(e) => set("invoiceFooterTerms", e.target.value)}
            />
          </div>
        </Panel>
      </div>

      <Panel title="Notifications">
        <SwitchRow
          label="Email me when someone sends an enquiry"
          checked={draft.adminEmailNotifications}
          onChange={(v) => set("adminEmailNotifications", v)}
        />
      </Panel>

      {/* Save bar appears only when something changed. */}
      {dirty ? (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4 lg:bottom-6 lg:left-64 lg:px-10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-atelier-ink px-4 py-3 text-sm text-white shadow-xl">
            <span role="status">You have unsaved changes.</span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={() => setDraft(saved)}
                disabled={saving}
                className="rounded-full px-4 py-2 font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Discard
              </button>
              <Button size="sm" loading={saving} onClick={() => void save()} className="!bg-gold !text-atelier-ink hover:!bg-gold/90">
                Save changes
              </Button>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
