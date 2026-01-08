import { Hero } from "@/components/sections/Hero";
import { FeaturedServices } from "@/components/sections/FeaturedServices";
import { GalleryPreview } from "@/components/sections/GalleryPreview";
import { CallToAction } from "@/components/sections/CallToAction";
import { InstagramFeed } from "@/components/sections/InstagramFeed";

export const revalidate = 1800; // 30 minutes

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedServices />
      <GalleryPreview />
      <CallToAction />
      <InstagramFeed />
    </>
  );
}
