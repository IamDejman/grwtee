"use client";

import { useEffect } from "react";

/** Adds classes to <body> while mounted, so portaled dialogs inherit admin fonts. */
export function BodyClass({ className }: { className: string }) {
  useEffect(() => {
    const names = className.split(" ").filter(Boolean);
    document.body.classList.add(...names);
    return () => document.body.classList.remove(...names);
  }, [className]);
  return null;
}
