"use client";

import * as React from "react";
import { Dialog } from "@headlessui/react";

export function Modal({
  open,
  onClose,
  children
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-gray-dark/50 backdrop-blur-sm" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl ring-1 ring-gray-medium/60">
            {children}
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
}


