"use client";

import { GoogleAnalytics, sendGAEvent } from "@next/third-parties/google";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isGALoaded } from "@/lib/analytics";

// Pages Analytics must never see: a December manage link is the only key to
// someone's booking, and admin pages are private. Page views send the full
// address, token included.
const PRIVATE_PATHS = ["/admin", "/december/manage"];

export function isPrivatePath(pathname: string | null): boolean {
  return !!pathname && PRIVATE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function AnalyticsProvider({ gaId }: { gaId: string | undefined }) {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);
  const privatePage = isPrivatePath(pathname);
  // Decided once: a visit that starts on a private page never loads Analytics.
  const [load] = useState(!privatePage);

  useEffect(() => {
    if (!gaId) return;
    // Google's own off switch, for when Analytics was loaded on a public page
    // and the visitor then moves to a private one: no hits while it's set.
    (window as unknown as Record<string, boolean>)[`ga-disable-${gaId}`] = privatePage;
  }, [gaId, privatePage]);

  useEffect(() => {
    if (!gaId || !isGALoaded() || privatePage) return;
    // Only send page_view on client-side navigation (skip initial load; GA config handles that)
    if (prevPathRef.current !== null && prevPathRef.current !== pathname) {
      sendGAEvent("event", "page_view", { page_path: pathname });
    }
    prevPathRef.current = pathname;
  }, [gaId, pathname, privatePage]);

  if (!gaId || !load) return null;

  return (
    <GoogleAnalytics
      gaId={gaId}
      debugMode={process.env.NODE_ENV === "development"}
    />
  );
}
