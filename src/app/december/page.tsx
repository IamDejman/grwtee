import { isSupportedCountry } from "libphonenumber-js";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DecemberFlow } from "@/components/december/DecemberFlow";
import { activeBookingCount, decemberEnabled } from "@/lib/december/booking";
import { bookingClosed } from "@/lib/december/availability";
import { feeLabel, getSettings } from "@/lib/december/settings";

export const metadata: Metadata = {
  title: "Lagos in December",
  description:
    "Have your December looks curated by GRWTEE. Share your plans and book a styling consultation."
};

export const viewport: Viewport = {
  themeColor: "#160F1F"
};

// Rendered per request: country detection, fee and capacity are live, and the flag is read at runtime.
export const dynamic = "force-dynamic";

export default async function DecemberPage() {
  if (!decemberEnabled()) notFound();
  const [requestHeaders, settings] = await Promise.all([headers(), getSettings()]);
  const country = requestHeaders.get("x-vercel-ip-country")?.toUpperCase() ?? "";
  const closed = bookingClosed(new Date(), settings.rules);
  const full = !closed && settings.capacity !== null && (await activeBookingCount().catch(() => 0)) >= settings.capacity;
  return (
    <DecemberFlow
      initialCountry={isSupportedCountry(country) ? country : ""}
      fee={feeLabel(settings)}
      full={full}
      closed={closed}
    />
  );
}
