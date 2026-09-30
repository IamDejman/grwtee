import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { ManageBooking } from "@/components/december/ManageBooking";
import { decemberEnabled, findBooking } from "@/lib/december/booking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your December consultation",
  robots: { index: false, follow: false },
  // The token in the URL is the only key to this booking; never leak it to other sites.
  referrer: "no-referrer"
};

export const viewport: Viewport = {
  themeColor: "#160F1F"
};

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  if (!decemberEnabled()) notFound();
  const { token } = await params;
  const booking = await findBooking(token);
  if (!booking) notFound();
  return (
    <ManageBooking
      token={token}
      initial={{
        name: booking.name,
        status: booking.status,
        slotStart: booking.slotStart.toISOString(),
        meetUrl: booking.meetUrl,
        canChange: booking.canChange
      }}
    />
  );
}
