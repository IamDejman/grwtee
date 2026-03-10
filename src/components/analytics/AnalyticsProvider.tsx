"use client";

import { GoogleAnalytics, sendGAEvent } from "@next/third-parties/google";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function AnalyticsProvider({ gaId }: { gaId: string | undefined }) {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!gaId || typeof window === "undefined") return;
    // Only send page_view on client-side navigation (skip initial load; GA config handles that)
    if (prevPathRef.current !== null && prevPathRef.current !== pathname) {
      sendGAEvent("event", "page_view", { page_path: pathname });
    }
    prevPathRef.current = pathname;
  }, [gaId, pathname]);

  if (!gaId) return null;

  return (
    <GoogleAnalytics
      gaId={gaId}
      debugMode={process.env.NODE_ENV === "development"}
    />
  );
}
