"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

export type GalleryImage = {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  cloudinaryId?: string | null;
  category: string;
};

const GalleryLightbox = dynamic(
  () => import("@/components/gallery/GalleryLightbox").then((m) => ({ default: m.default })),
  { ssr: false }
);

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  personal: "Personal Styling",
  wardrobe: "Wardrobe",
  event: "Events",
  vacation: "Vacation",
  photoshoot: "Photoshoots"
};

function cloudinaryBlurDataURL(publicId: string) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloud) return null;
  // Tiny blurred image for placeholder
  return `https://res.cloudinary.com/${cloud}/image/upload/w_20,q_20,e_blur:2000,f_auto/${publicId}.jpg`;
}

export function GalleryClient({ images }: { images: GalleryImage[] }) {
  const [category, setCategory] = useState<string>("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (category === "all") return images;
    return images.filter((i) => i.category === category);
  }, [images, category]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (openIndex === null) return;
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight")
        setOpenIndex((prev) =>
          prev === null ? null : Math.min(prev + 1, filtered.length - 1)
        );
      if (e.key === "ArrowLeft")
        setOpenIndex((prev) => (prev === null ? null : Math.max(prev - 1, 0)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, filtered.length]);

  const categories = Object.keys(CATEGORY_LABELS);
  const current = openIndex === null ? null : filtered[openIndex];

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCategory(c);
              setOpenIndex(null);
            }}
            className={[
              "rounded-full border px-4 py-2 text-sm font-medium transition",
              category === c
                ? "border-green-dark bg-green-dark text-white"
                : "border-gray-medium/60 bg-white text-gray-dark hover:border-green-dark hover:text-green-dark"
            ].join(" ")}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {filtered.map((img, idx) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setOpenIndex(idx)}
            className="group mb-4 w-full break-inside-avoid overflow-hidden rounded-xl bg-white text-left shadow-md ring-1 ring-gray-medium/40"
          >
            <div className="relative aspect-[3/4] overflow-hidden">
              <Image
                src={img.imageUrl}
                alt={img.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                placeholder={
                  img.cloudinaryId && cloudinaryBlurDataURL(img.cloudinaryId)
                    ? "blur"
                    : "empty"
                }
                blurDataURL={
                  img.cloudinaryId ? cloudinaryBlurDataURL(img.cloudinaryId) || undefined : undefined
                }
              />
            </div>
            <div className="p-4">
              <p className="font-accent text-xs font-semibold tracking-wide text-green-dark">
                {img.title}
              </p>
            </div>
          </button>
        ))}
        {!filtered.length ? (
          <p className="text-sm text-gray-dark/70">No images in this category yet.</p>
        ) : null}
      </div>

      {openIndex !== null && current ? (
        <GalleryLightbox
          open
          onClose={() => setOpenIndex(null)}
          current={current}
          index={openIndex}
          total={filtered.length}
          onPrev={() =>
            setOpenIndex((prev) => (prev === null ? null : Math.max(prev - 1, 0)))
          }
          onNext={() =>
            setOpenIndex((prev) =>
              prev === null ? null : Math.min(prev + 1, filtered.length - 1)
            )
          }
        />
      ) : null}
    </>
  );
}


