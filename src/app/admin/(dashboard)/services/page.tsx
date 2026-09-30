"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/admin/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import { EmptyState, PageHeader, Panel, RowAction, SearchInput, SkeletonRows, Switch, SwitchRow } from "@/components/admin/ui";
import { slugify } from "@/lib/utils";
import { adminFetch } from "@/lib/adminFetch";

type Service = {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceUSD: number | null;
  priceNGN: number | null;
  priceNote: string | null;
  featured: boolean;
  active: boolean;
  order: number;
};

type Draft = Omit<Service, "id"> & { id?: string };

const emptyDraft: Draft = {
  name: "",
  slug: "",
  description: "",
  priceUSD: null,
  priceNGN: null,
  priceNote: null,
  featured: false,
  active: true,
  order: 0
};

const money = (n: number | null, symbol: string) =>
  n === null ? null : `${symbol}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n)}`;

function prices(s: Service) {
  const parts = [money(s.priceNGN, "₦"), money(s.priceUSD, "$")].filter(Boolean);
  return parts.length ? parts.join(" · ") : s.priceNote || "-";
}

const toNumber = (v: string) => {
  const n = Number(v.replace(/[^\d.]/g, ""));
  return v.trim() && Number.isFinite(n) ? n : null;
};

export default function AdminServicesPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const { confirm, dialog } = useConfirm();
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/services");
      const json = await res.json();
      if (!res.ok) throw new Error("Failed");
      setItems(json.data || []);
    } catch {
      setError("Couldn't load services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  }, [items, query]);

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const save = async () => {
    if (!draft) return;
    if (draft.name.trim().length < 2 || draft.description.trim().length < 2) {
      setFormError("Add a name and a description.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const body = {
      name: draft.name.trim(),
      slug: draft.id ? draft.slug : slugify(draft.name),
      description: draft.description.trim(),
      priceUSD: draft.priceUSD,
      priceNGN: draft.priceNGN,
      priceNote: draft.priceNote?.trim() || null,
      featured: draft.featured,
      active: draft.active,
      order: draft.order
    };
    try {
      const res = await adminFetch(draft.id ? `/api/services/${draft.id}` : "/api/services", {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(draft.id ? "Service saved." : "Service added.");
      setDraft(null);
      await load();
    } catch {
      setFormError("Couldn't save the service. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: Service) => {
    const ok = await confirm({
      title: `Delete ${s.name}?`,
      body: "It will be removed from the website. This can't be undone.",
      confirmLabel: "Delete",
      danger: true
    });
    if (!ok) return;
    try {
      const res = await adminFetch(`/api/services/${s.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setItems((prev) => prev.filter((x) => x.id !== s.id));
      setDraft(null);
      toast.success(`${s.name} deleted.`);
    } catch {
      toast.error("Couldn't delete the service. Try again.");
    }
  };

  const quickToggle = async (s: Service, patch: Pick<Partial<Service>, "active" | "featured">) => {
    setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...patch } : x)));
    try {
      const res = await adminFetch(`/api/services/${s.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(
        patch.active !== undefined
          ? `${s.name} ${patch.active ? "shown on" : "hidden from"} the website.`
          : `${s.name} ${patch.featured ? "featured" : "no longer featured"}.`
      );
    } catch {
      setItems((prev) => prev.map((x) => (x.id === s.id ? s : x)));
      toast.error("Couldn't update the service. Try again.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Services"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setFormError(null);
              setDraft({ ...emptyDraft, order: items.length });
            }}
          >
            Add service
          </Button>
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {items.length > 5 ? (
        <div className="mb-4 sm:w-72">
          <SearchInput label="Search services" placeholder="Search services…" value={query} onChange={setQuery} />
        </div>
      ) : null}

      <Panel className="!p-0 sm:!p-0">
        {loading && !items.length ? (
          <div className="p-5">
            <SkeletonRows />
          </div>
        ) : !filtered.length ? (
          <EmptyState icon={Briefcase} title={items.length ? "No services match." : "No services yet."} />
        ) : (
          <ul className="divide-y divide-atelier-border/70">
            {filtered.map((s) => (
              <li key={s.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${s.active ? "text-atelier-ink" : "text-atelier-faint"}`}>{s.name}</p>
                  <p className="mt-0.5 text-sm tabular-nums text-atelier-muted">{prices(s)}</p>
                </div>
                <div className="flex items-center gap-5">
                  <span className="flex items-center gap-2 text-sm text-atelier-muted">
                    <Switch checked={s.active} onChange={(v) => void quickToggle(s, { active: v })} label={`Show ${s.name} on website`} />
                    On website
                  </span>
                  <span className="flex items-center gap-2 text-sm text-atelier-muted">
                    <Switch checked={s.featured} onChange={(v) => void quickToggle(s, { featured: v })} label={`Feature ${s.name}`} />
                    Featured
                  </span>
                  <RowAction
                    className="ml-auto sm:ml-0"
                    onClick={() => {
                      setFormError(null);
                      setDraft(s);
                    }}
                  >
                    Edit
                  </RowAction>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Edit service" : "Add service"}>
        {draft ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input label="Name" value={draft.name} onChange={(e) => set({ name: e.target.value })} autoComplete="off" />
              </div>
              <div className="sm:col-span-2">
                <Textarea label="Description" rows={4} value={draft.description} onChange={(e) => set({ description: e.target.value })} />
              </div>
              <Input
                label="Price in naira"
                adornment="₦"
                inputMode="decimal"
                autoComplete="off"
                value={draft.priceNGN ?? ""}
                onChange={(e) => set({ priceNGN: toNumber(e.target.value) })}
              />
              <Input
                label="Price in dollars"
                adornment="$"
                inputMode="decimal"
                autoComplete="off"
                value={draft.priceUSD ?? ""}
                onChange={(e) => set({ priceUSD: toNumber(e.target.value) })}
              />
              <Input
                label="Price note"
                placeholder="e.g. From, per session…"
                autoComplete="off"
                value={draft.priceNote ?? ""}
                onChange={(e) => set({ priceNote: e.target.value })}
              />
              <Input
                label="Position"
                type="number"
                min={0}
                inputMode="numeric"
                value={draft.order}
                onChange={(e) => set({ order: Number(e.target.value) || 0 })}
              />
              <SwitchRow label="Show on website" checked={draft.active} onChange={(v) => set({ active: v })} />
              <SwitchRow label="Featured" checked={draft.featured} onChange={(v) => set({ featured: v })} />
            </div>

            {formError ? (
              <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-atelier-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              {draft.id ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="!text-red-600 hover:!bg-red-50"
                  onClick={() => void remove(draft as Service)}
                >
                  Delete service
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" size="sm" loading={saving}>
                {draft.id ? "Save changes" : "Add service"}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
      {dialog}
    </div>
  );
}
