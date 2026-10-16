import { Hero } from "@/components/sections/Hero";
import { FeaturedServices } from "@/components/sections/FeaturedServices";
import { GalleryPreview } from "@/components/sections/GalleryPreview";
import { CallToAction } from "@/components/sections/CallToAction";
import { bookingClosed } from "@/lib/december/availability";
import { activeBookingCount, decemberEnabled } from "@/lib/december/booking";
import { getSettings } from "@/lib/december/settings";

export const revalidate = 1800; // 30 minutes

// Same closed and full checks as the December page, so the hero only points there while clients can book.
async function decemberOpen(): Promise<boolean> {
  if (!decemberEnabled()) return false;
  const settings = await getSettings();
  if (bookingClosed(new Date(), settings.rules)) return false;
  if (settings.capacity === null) return true;
  return (await activeBookingCount().catch(() => 0)) < settings.capacity;
}

export default async function HomePage() {
  return (
    <>
      <Hero december={await decemberOpen()} />
      <FeaturedServices />
      <GalleryPreview />
      <CallToAction />
    </>
  );
}
