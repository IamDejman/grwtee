"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { slugify } from "@/lib/utils";

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

const emptyDraft: Omit<Service, "id"> = {
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

export default function AdminServicesPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Omit<Service, "id">>(emptyDraft);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/services");
      const json = await res.json();
      if (!res.ok) throw new Error("Failed");
      setItems(json.data || []);
    } catch {
      setError("Failed to load services.");
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
    return items.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [items, query]);

  const startCreate = () => {
    setDraft(emptyDraft);
    setCreating(true);
  };

  const create = async () => {
    if (!draft.name.trim() || !draft.description.trim()) {
      setError("Name and description are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body = {
        ...draft,
        slug: draft.slug?.trim() ? draft.slug.trim() : slugify(draft.name)
      };
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("Failed");
      setCreating(false);
      await load();
    } catch {
      setError("Failed to create service.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!editing) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/services/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          slug: editing.slug,
          description: editing.description,
          priceUSD: editing.priceUSD ?? undefined,
          priceNGN: editing.priceNGN ?? undefined,
          priceNote: editing.priceNote ?? undefined,
          featured: editing.featured,
          active: editing.active,
          order: editing.order
        })
      });
      if (!res.ok) throw new Error("Failed");
      setEditing(null);
      await load();
    } catch {
      setError("Failed to save service.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      await load();
    } catch {
      setError("Failed to delete service.");
    } finally {
      setLoading(false);
    }
  };

  const quickToggle = async (id: string, patch: Partial<Service>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      if (!res.ok) throw new Error("Failed");
      await load();
    } catch {
      setError("Failed to update service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-purple-dark">
            Services Management
          </h1>
          <p className="mt-2 text-sm text-gray-dark/80">
            Create, edit, reorder, and toggle featured/active services.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
          <Button onClick={startCreate}>Add Service</Button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-md">
            <Input
              label="Search"
              placeholder="Search name/slug/description"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-gray-medium/60 text-left text-xs font-semibold uppercase tracking-wider text-gray-dark/70">
                <th className="py-3 pr-4">Service</th>
                <th className="py-3 pr-4">Slug</th>
                <th className="py-3 pr-4">USD</th>
                <th className="py-3 pr-4">NGN</th>
                <th className="py-3 pr-4">Featured</th>
                <th className="py-3 pr-4">Active</th>
                <th className="py-3 pr-4">Order</th>
                <th className="py-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-medium/60">
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="py-3 pr-4 font-semibold text-purple-medium">
                    {s.name}
                  </td>
                  <td className="py-3 pr-4 text-gray-dark/80">{s.slug}</td>
                  <td className="py-3 pr-4">{s.priceUSD ?? "—"}</td>
                  <td className="py-3 pr-4">{s.priceNGN ?? "—"}</td>
                  <td className="py-3 pr-4">
                    <button
                      className="rounded-full border border-gray-medium/60 px-3 py-1 text-xs font-semibold hover:border-teal-dark hover:text-teal-dark"
                      onClick={() => quickToggle(s.id, { featured: !s.featured })}
                      disabled={loading}
                    >
                      {s.featured ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      className="rounded-full border border-gray-medium/60 px-3 py-1 text-xs font-semibold hover:border-teal-dark hover:text-teal-dark"
                      onClick={() => quickToggle(s.id, { active: !s.active })}
                      disabled={loading}
                    >
                      {s.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="py-3 pr-4">{s.order}</td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-3">
                      <button
                        className="text-xs font-semibold text-teal-dark hover:text-purple-dark"
                        onClick={() => setEditing(s)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                        onClick={() => remove(s.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td className="py-4 text-gray-dark/70" colSpan={8}>
                    No services found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)}>
        <div>
          <h3 className="font-heading text-xl font-semibold text-purple-dark">
            Add Service
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label="Name"
              value={draft.name}
              onChange={(e) => {
                const name = e.target.value;
                setDraft((d) => ({ ...d, name, slug: slugify(name) }));
              }}
            />
            <Input
              label="Slug"
              value={draft.slug}
              onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
            />
            <div className="md:col-span-2">
              <Textarea
                label="Description"
                rows={5}
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <Input
              label="Price USD"
              type="number"
              value={draft.priceUSD ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, priceUSD: e.target.value ? Number(e.target.value) : null }))
              }
            />
            <Input
              label="Price NGN"
              type="number"
              value={draft.priceNGN ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, priceNGN: e.target.value ? Number(e.target.value) : null }))
              }
            />
            <Input
              label="Price Note"
              value={draft.priceNote ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, priceNote: e.target.value }))}
            />
            <Input
              label="Order"
              type="number"
              value={draft.order}
              onChange={(e) => setDraft((d) => ({ ...d, order: Number(e.target.value) }))}
            />
            <div className="flex items-center justify-between md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-dark/80">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(e) => setDraft((d) => ({ ...d, featured: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-medium"
                />
                Featured
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-dark/80">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-medium"
                />
                Active
              </label>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={create} loading={loading}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)}>
        {editing ? (
          <div>
            <h3 className="font-heading text-xl font-semibold text-purple-dark">
              Edit Service
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input
                label="Name"
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
              <Input
                label="Slug"
                value={editing.slug}
                onChange={(e) =>
                  setEditing({ ...editing, slug: e.target.value })
                }
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Description"
                  rows={5}
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                />
              </div>
              <Input
                label="Price USD"
                type="number"
                value={editing.priceUSD ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    priceUSD: e.target.value ? Number(e.target.value) : null
                  })
                }
              />
              <Input
                label="Price NGN"
                type="number"
                value={editing.priceNGN ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    priceNGN: e.target.value ? Number(e.target.value) : null
                  })
                }
              />
              <Input
                label="Price Note"
                value={editing.priceNote ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, priceNote: e.target.value })
                }
              />
              <Input
                label="Order"
                type="number"
                value={editing.order}
                onChange={(e) =>
                  setEditing({ ...editing, order: Number(e.target.value) })
                }
              />
              <div className="flex items-center justify-between md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm text-gray-dark/80">
                  <input
                    type="checkbox"
                    checked={editing.featured}
                    onChange={(e) =>
                      setEditing({ ...editing, featured: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-medium"
                  />
                  Featured
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-dark/80">
                  <input
                    type="checkbox"
                    checked={editing.active}
                    onChange={(e) =>
                      setEditing({ ...editing, active: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-medium"
                  />
                  Active
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={save} loading={loading}>
                Save
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}


