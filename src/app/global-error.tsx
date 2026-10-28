"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** The last-resort error page; the error is reported when Sentry is on (OPS-07). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1.5rem", textAlign: "center", color: "#1f1a24" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 600 }}>Something went wrong.</h1>
        <p style={{ marginTop: "0.75rem", color: "#5c5566" }}>Try again, or come back in a few minutes.</p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: "1.5rem", padding: "0.75rem 2rem", borderRadius: 999, border: 0, background: "#2f5d50", color: "white", fontWeight: 600, cursor: "pointer" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
