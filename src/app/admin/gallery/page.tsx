"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";

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
  { value: "personal", label: "Personal Styling" },
  { value: "wardrobe", label: "Wardrobe Styling" },
  { value: "event", label: "Event Styling" },
  { value: "vacation", label: "Vacation Styling" },
  { value: "photoshoot", label: "Photoshoot Styling" }
];

export default function AdminGalleryPage() {
  const [items, setItems] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  // upload state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploadCategory, setUploadCategory] = useState("personal");
  const [featured, setFeatured] = useState(false);
  const [order, setOrder] = useState<number>(0);

  // edit state
  const [editing, setEditing] = useState<GalleryImage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<GalleryImage | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const matchesQuery = !q
        ? true
        : i.title.toLowerCase().includes(q) ||
          (i.description || "").toLowerCase().includes(q);
      const matchesCategory = category === "all" ? true : i.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [items, query, category]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gallery");
      const json = await res.json();
      if (!res.ok) throw new Error("Failed to fetch");
      setItems(json.data || []);
    } catch {
      setError("Failed to load gallery images.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const uploadAndCreate = async () => {
    if (!file) {
      setError("Please choose an image file.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "grwtee");
      const up = await fetch("/api/upload", { method: "POST", body: form });
      const upJson = await up.json();
      if (!up.ok) throw new Error("Upload failed");

      const create = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          imageUrl: upJson.data.imageUrl,
          cloudinaryId: upJson.data.cloudinaryId,
          category: uploadCategory,
          featured,
          order
        })
      });
      if (!create.ok) throw new Error("Create failed");
      setFile(null);
      setTitle("");
      setDescription("");
      setFeatured(false);
      setOrder(0);
      await load();
    } catch {
      setError("Upload failed. Check Cloudinary + env variables.");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const saveEdit = async (img: GalleryImage) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gallery/${img.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: img.title,
          description: img.description || undefined,
          category: img.category,
          featured: img.featured,
          order: img.order
        })
      });
      if (!res.ok) throw new Error("Update failed");
      setEditing(null);
      await load();
    } catch {
      setError("Failed to save changes.");
    } finally {
      setLoading(false);
    }
  };

  const doDelete = async (img: GalleryImage) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gallery/${img.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setConfirmDelete(null);
      await load();
    } catch {
      setError("Failed to delete image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-purple-dark">
            Gallery Management
          </h1>
          <p className="mt-2 text-sm text-gray-dark/80">
            Upload, edit, feature, and organize your portfolio images.
          </p>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60 lg:col-span-1">
          <h2 className="font-accent text-sm font-semibold tracking-wider text-teal-dark">
            Upload Images
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-dark">
                Image File
              </label>
              <div
                className="mt-2 rounded-lg border-2 border-dashed border-gray-medium/70 bg-cream-light px-4 py-6 text-center text-sm text-gray-dark/70"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
              >
                <p className="font-semibold text-gray-dark">Drag & drop an image here</p>
                <p className="mt-1">or click to select a file</p>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-3 w-full text-sm"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              {file ? (
                <p className="mt-1 text-xs text-gray-dark/70">
                  Selected: {file.name}
                </p>
              ) : null}
            </div>
            <Input
              label="Title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Corporate event look"
            />
            <Textarea
              label="Description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
            <Select
              label="Category"
              options={categoryOptions}
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-gray-dark/80">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-medium"
                />
                Featured
              </label>
              <div className="w-28">
                <Input
                  label="Order"
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                />
              </div>
            </div>

            <Button type="button" onClick={uploadAndCreate} loading={loading}>
              Upload
            </Button>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60 lg:col-span-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full gap-3">
              <div className="flex-1">
                <Input
                  label="Search"
                  placeholder="Search by title/description"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="w-56">
                <Select
                  label="Filter"
                  options={[
                    { value: "all", label: "All categories" },
                    ...categoryOptions
                  ]}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((img) => (
              <div
                key={img.id}
                className="overflow-hidden rounded-xl border border-gray-medium/60"
              >
                <div className="relative aspect-[3/4] bg-cream">
                  <Image
                    src={img.imageUrl}
                    alt={img.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-accent text-sm font-semibold text-purple-medium">
                        {img.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-dark/70">
                        {img.category} • {img.featured ? "Featured" : "—"} • #{img.order}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="text-xs font-semibold text-teal-dark hover:text-purple-dark"
                        onClick={() => setEditing(img)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                        onClick={() => setConfirmDelete(img)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!filtered.length ? (
              <p className="text-sm text-gray-dark/70">No images found.</p>
            ) : null}
          </div>
        </div>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)}>
        {editing ? (
          <div>
            <h3 className="font-heading text-xl font-semibold text-purple-dark">
              Edit Image
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-cream">
                <Image
                  src={editing.imageUrl}
                  alt={editing.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-4">
                <Input
                  label="Title"
                  value={editing.title}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                />
                <Textarea
                  label="Description"
                  rows={4}
                  value={editing.description || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                />
                <Select
                  label="Category"
                  options={categoryOptions}
                  value={editing.category}
                  onChange={(e) =>
                    setEditing({ ...editing, category: e.target.value })
                  }
                />
                <div className="flex items-center justify-between">
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
                  <div className="w-28">
                    <Input
                      label="Order"
                      type="number"
                      value={editing.order}
                      onChange={(e) =>
                        setEditing({ ...editing, order: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => saveEdit(editing)} loading={loading}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        {confirmDelete ? (
          <div>
            <h3 className="font-heading text-xl font-semibold text-purple-dark">
              Delete image?
            </h3>
            <p className="mt-2 text-sm text-gray-dark/80">
              This action cannot be undone. The image will be deleted from Cloudinary and the database.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => doDelete(confirmDelete)}
                loading={loading}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}


