import { ButtonLink } from "@/components/ui/Button";
import Image from "next/image";
import { getFeaturedGalleryImages } from "@/lib/cached";

// Unsplash Source placeholder images - fashion/styling focused
const placeholderImages = [
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&h=600&fit=crop"
];

const placeholders = Array.from({ length: 12 }).map((_, i) => ({
  id: `ph-${i}`,
  title: "Featured Styling Work",
  imageUrl: placeholderImages[i % placeholderImages.length]
}));

export async function GalleryPreview() {
  let items: Array<{ id: string; title: string; imageUrl: string; cloudinaryId?: string | null }> =
    placeholders;
  try {
    const featured = await getFeaturedGalleryImages(12);
    if (featured.length) items = featured;
  } catch {
    // DB not configured yet; keep placeholders.
  }

  return (
    <section className="pattern-light py-16">
      <div className="container-shell">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
              Portfolio Preview
            </h2>
            <p className="mt-2 max-w-2xl font-body text-base text-gray-dark/80">
              A curated glimpse into recent work. Once your admin gallery is live,
              this section will automatically pull featured images.
            </p>
          </div>
          <ButtonLink href="/gallery" variant="primary">
            View Full Portfolio
          </ButtonLink>
        </div>

        <div className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {items.map((img) => (
            <div
              key={img.id}
              className="group mb-4 break-inside-avoid overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-gray-medium/40"
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                <Image
                  src={img.imageUrl}
                  alt={img.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  placeholder="empty"
                />
              </div>
              <div className="p-4">
                <p className="font-accent text-xs font-semibold tracking-wide text-green-dark">
                  Featured
                </p>
                <p className="mt-1 font-body text-sm text-gray-dark/80">
                  {img.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


