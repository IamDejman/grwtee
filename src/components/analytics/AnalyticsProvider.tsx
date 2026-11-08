"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { gtag, isGALoaded } from "@/lib/analytics";

export function AnalyticsProvider({ gaId }: { gaId: string | undefined }) {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!gaId || !isGALoaded()) return;
    // Only send page_view on client-side navigation (skip initial load; GA config handles that)
    if (prevPathRef.current !== null && prevPathRef.current !== pathname) {
      gtag("event", "page_view", { page_path: pathname });
    }
    prevPathRef.current = pathname;
  }, [gaId, pathname]);

  if (!gaId) return null;

  const debug = process.env.NODE_ENV === "development" ? ", { debug_mode: true }" : "";
  // Loaded once the page has finished loading and the browser is idle: Google's script is the
  // largest on every page (177 KB) and was preloaded ahead of the page's own on slow phones.
  return (
    <>
      <Script id="ga-init" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${JSON.stringify(gaId)}${debug});`}
      </Script>
      <Script
        id="ga"
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
      />
    </>
  );
}
