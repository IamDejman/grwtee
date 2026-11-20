"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { gtag, isGALoaded, trackEvent } from "@/lib/analytics";

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

  // One listener for every link or button marked data-track="name", so server components can be
  // tracked without becoming client components.
  useEffect(() => {
    if (!gaId) return;
    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target.closest("[data-track]") : null;
      const cta = el?.getAttribute("data-track");
      if (cta) trackEvent("cta_click", { cta, page_path: window.location.pathname });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [gaId]);

  if (!gaId) return null;

  const debug = process.env.NODE_ENV === "development" ? ", { debug_mode: true }" : "";
  // The few lines that define gtag() run as soon as the page is interactive, so events fired before
  // Google's script arrives wait in the queue instead of being lost. The script itself loads once
  // the page has finished loading and the browser is idle: it is the largest on every page
  // (177 KB) and was preloaded ahead of the page's own on slow phones.
  return (
    <>
      <Script id="ga-init" strategy="afterInteractive">
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
