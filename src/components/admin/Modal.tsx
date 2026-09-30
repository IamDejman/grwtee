"use client";

import * as React from "react";
import { Dialog } from "@headlessui/react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  children,
  fullScreen,
  title,
  size = "lg"
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  fullScreen?: boolean;
  /** Adds a header with the title and a close button. */
  title?: React.ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-[#1A1428]/40 backdrop-blur-[2px]" />
      <div className="fixed inset-0 overflow-y-auto overscroll-contain">
        <div className={`flex min-h-full ${fullScreen ? "items-center justify-center p-0" : "items-end justify-center p-0 sm:items-center sm:p-4"}`}>
          <Dialog.Panel
            className={
              fullScreen
                ? "h-full w-full max-w-none rounded-none bg-transparent p-0 shadow-none ring-0"
                : `w-full ${size === "md" ? "max-w-lg" : "max-w-3xl"} rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl ring-1 ring-black/5 sm:rounded-2xl sm:p-7`
            }
          >
            {title ? (
              <div className="mb-5 flex items-start justify-between gap-4">
                <Dialog.Title className="font-cormorant text-2xl font-medium leading-tight text-[#1A1428] sm:text-3xl">
                  {title}
                </Dialog.Title>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="-mr-2 -mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#9A8DAA] transition hover:bg-[#F2EDF8] hover:text-[#1A1428]"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            ) : null}
            {children}
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
}
