"use client";

import Image from "next/image";
import { Modal } from "@/components/ui/Modal";
import type { GalleryImage } from "@/components/gallery/GalleryClient";

export default function GalleryLightbox({
  open,
  onClose,
  current,
  index,
  total,
  onPrev,
  onNext
}: {
  open: boolean;
  onClose: () => void;
  current: GalleryImage;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-cream">
          <Image src={current.imageUrl} alt={current.title} fill className="object-cover" />
        </div>
        <div>
          <p className="font-accent text-xs font-semibold tracking-wider text-green-dark">
            {index + 1} / {total}
          </p>
          <h3 className="mt-2 font-heading text-2xl font-semibold text-purple-dark">
            {current.title}
          </h3>
          {current.description ? (
            <p className="mt-2 text-sm text-gray-dark/80">{current.description}</p>
          ) : null}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              className="rounded-full border border-gray-medium/60 px-5 py-2 text-sm font-semibold text-gray-dark hover:border-green-dark hover:text-green-dark"
              onClick={onPrev}
              disabled={index === 0}
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-full border border-gray-medium/60 px-5 py-2 text-sm font-semibold text-gray-dark hover:border-green-dark hover:text-green-dark"
              onClick={onNext}
              disabled={index >= total - 1}
            >
              Next
            </button>
            <button
              type="button"
              className="ml-auto rounded-full bg-green-dark px-6 py-2 text-sm font-semibold text-white hover:bg-purple-medium"
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-dark/60">
            Tip: Use arrow keys to navigate, ESC to close.
          </p>
        </div>
      </div>
    </Modal>
  );
}


