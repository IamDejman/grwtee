"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Images, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/admin/Modal";
import { useToast } from "@/components/admin/Toast";
import { EmptyState, FilterChips, PageHeader, RowAction, SearchInput, SwitchRow } from "@/components/admin/ui";
import { adminFetch } from "@/lib/adminFetch";

type GalleryImage = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  cloudinaryId: string;
  category: string;
  featured: boolean;
  order: number;
  createdAt: string;
};

const categoryOptions = [
  { value: "personal", label: "Personal styling" },
  { value: "wardrobe", label: "Wardrobe styling" },
  { value: "event", label: "Event styling" },
  { value: "vacation", label: "Vacation styling" },
  { value: "photoshoot", label: "Photoshoot styling" }
];

const categoryLabel = (value: string) => categoryOptions.find((c) => c.value === value)?.label ?? value;

type Draft = { title: string; description: string; category: string; featured: boolean; order: number };
const emptyDraft: Draft = { title: "", description: "", category: "personal", featured: false, order: 0 };

function DetailsFields({ draft, onChange }: { draft: Draft; onChange: (draft: Draft) => void }) {
  return (
    <div className="space-y-4">
      <Input label="Title" required value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} placeholder="e.g. Corporate event look…" />
      <Textarea label="Description" rows={3} value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })} />
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Select label="Category" options={categoryOptions} value={draft.category} onChange={(e) => onChange({ ...draft, category: e.target.value })} />
        <Input label="Position" type="number" inputMode="numeric" value={draft.order} onChange={(e) => onChange({ ...draft, order: Number(e.target.value) })} />
      </div>
      <SwitchRow label="Feature on the homepage" checked={draft.featured} onChange={(featured) => onChange({ ...draft, featured })} />
    </div>
  );
}

export default function AdminGalleryPage() {
  const [items, setItems] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formError, setFormError] = useState<string | null>(null);

  const [editing, setEditing] = useState<GalleryImage | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (category === "featured" ? !i.featured : category !== "all" && i.category !== category) return false;
      return !q || i.title.toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q);
    });
  }, [items, query, category]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/gallery");
      const json = await res.json();
      if (!res.ok) throw new Error("Failed to fetch");
      setItems(json.data || []);
    } catch {
      setError("Couldn't load the gallery. Refresh to try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const openUpload = () => {
    setFile(null);
    setDraft(emptyDraft);
    setFormError(null);
    setUploadOpen(true);
  };

  const pickFile = (f: File | undefined | null) => {
    if (!f) return;
    setFile(f);
    if (!draft.title) setDraft((d) => ({ ...d, title: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") }));
  };

  const uploadAndCreate = async () => {
    if (!file) return setFormError("Choose an image.");
    if (!draft.title.trim()) return setFormError("Add a title.");
    setBusy(true);
    setFormError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "grwtee");
      const up = await adminFetch("/api/upload", { method: "POST", body: form });
      const upJson = await up.json();
      if (!up.ok) throw new Error("Upload failed");

      const create = await adminFetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          description: draft.description.trim() || undefined,
          imageUrl: upJson.data.imageUrl,
          cloudinaryId: upJson.data.cloudinaryId,
          category: draft.category,
          featured: draft.featured,
          order: draft.order
        })
      });
      if (!create.ok) throw new Error("Create failed");
      setUploadOpen(false);
      toast.success("Image added to the gallery.");
      await load();
    } catch {
      setFormError("Upload failed. Try again, or try a smaller image.");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (img: GalleryImage) => {
    setEditing(img);
    setEditDraft({
      title: img.title,
      description: img.description ?? "",
      category: img.category,
      featured: img.featured,
      order: img.order
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const res = await adminFetch(`/api/gallery/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editDraft, description: editDraft.description.trim() || undefined })
      });
      if (!res.ok) throw new Error("Update failed");
      setEditing(null);
      toast.success("Changes saved.");
      await load();
    } catch {
      toast.error("Couldn't save changes. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (img: GalleryImage) => {
    const ok = await confirm({
      title: `Delete "${img.title}"?`,
      body: "It's removed from the site and from image storage. This can't be undone.",
      confirmLabel: "Delete",
      danger: true
    });
    if (!ok) return;
    try {
      const res = await adminFetch(`/api/gallery/${img.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((x) => x.id !== img.id));
      setEditing(null);
      toast.success("Image deleted.");
    } catch {
      toast.error("Couldn't delete the image. Try again.");
    }
  };

  const countFor = (value: string) => items.filter((i) => i.category === value).length;

  return (
    <div>
      <PageHeader
        title="Gallery"
        actions={
          <Button size="sm" onClick={openUpload}>
            Upload image
          </Button>
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          label="Filter by category"
          value={category}
          onChange={setCategory}
          options={[
            { value: "all", label: "All", count: items.length },
            { value: "featured", label: "Featured", count: items.filter((i) => i.featured).length },
            ...categoryOptions.map((c) => ({ value: c.value, label: c.label.replace(" styling", ""), count: countFor(c.value) }))
          ]}
        />
        <div className="lg:w-72">
          <SearchInput label="Search gallery" placeholder="Search titles…" value={query} onChange={setQuery} />
        </div>
      </div>

      {loading && !items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-atelier-border/60" />
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="rounded-2xl border border-atelier-border bg-white">
          <EmptyState
            icon={Images}
            title={items.length ? "No images match." : "No images yet."}
            action={
              items.length ? null : (
                <Button size="sm" variant="outline" onClick={openUpload}>
                  Upload the first one
                </Button>
              )
            }
          />
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((img) => (
            <li key={img.id} className="overflow-hidden rounded-2xl border border-atelier-border bg-white">
              <button type="button" onClick={() => openEdit(img)} className="group relative block aspect-[3/4] w-full bg-atelier-canvas" aria-label={`Edit ${img.title}`}>
                <Image src={img.imageUrl} alt="" fill className="object-cover transition duration-300 group-hover:scale-[1.03]" sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw" />
                {img.featured ? (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-[#8A6420] backdrop-blur">
                    <Star className="h-3 w-3 fill-current" aria-hidden />
                    Featured
                  </span>
                ) : null}
              </button>
              <div className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-atelier-ink">{img.title}</p>
                  <p className="truncate text-xs text-atelier-faint">{categoryLabel(img.category)}</p>
                </div>
                <RowAction className="-mr-1 -mt-1 hidden shrink-0 sm:inline-flex" onClick={() => openEdit(img)}>
                  Edit
                </RowAction>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={uploadOpen} onClose={() => !busy && setUploadOpen(false)} title="Upload image">
        <div className="grid gap-5 md:grid-cols-2">
          <label
            className="relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-atelier-border bg-atelier-canvas text-center text-sm text-atelier-muted transition hover:border-purple-dark/40 focus-within:ring-2 focus-within:ring-purple-dark/30"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickFile(e.dataTransfer.files?.[0]);
            }}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <>
                <ImagePlus className="h-7 w-7 text-purple-dark" aria-hidden />
                <span className="font-medium text-atelier-ink">Drop an image or tap to choose</span>
              </>
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
          </label>
          <div className="flex flex-col">
            <DetailsFields draft={draft} onChange={setDraft} />
            {formError ? (
              <p className="mt-4 text-sm font-medium text-red-600" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="mt-auto flex justify-end gap-3 pt-6">
              <Button size="sm" variant="ghost" onClick={() => setUploadOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button size="sm" onClick={uploadAndCreate} loading={busy}>
                Upload
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!editing} onClose={() => !busy && setEditing(null)} title="Edit image">
        {editing ? (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-atelier-canvas">
              <Image src={editing.imageUrl} alt={editing.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 380px" />
            </div>
            <div className="flex flex-col">
              <DetailsFields draft={editDraft} onChange={setEditDraft} />
              <div className="mt-auto flex items-center justify-between gap-3 pt-6">
                <RowAction danger className="-ml-2.5" onClick={() => void remove(editing)} disabled={busy}>
                  Delete
                </RowAction>
                <div className="flex gap-3">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveEdit} loading={busy}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
      {dialog}
    </div>
  );
}
