import { GalleryClient } from "@/components/gallery/GalleryClient";
import { getGalleryImages } from "@/lib/cached";

export const metadata = {
  title: "Gallery",
  description: "Featured work across personal styling, wardrobe, events, vacation, and photoshoots."
};

export const revalidate = 1800; // 30 minutes

export default function GalleryPage() {
  return (
    <div className="pattern-light">
      <div className="container-shell py-16">
        <h1 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
          Gallery
        </h1>
        <p className="mt-2 font-body text-base text-gray-dark/80">
          A curated selection of recent styling work.
        </p>

        {/* Server fetch */}
        <GalleryPageData />
      </div>
    </div>
  );
}

async function GalleryPageData() {
  let images: Array<{
    id: string;
    title: string;
    description: string | null;
    imageUrl: string;
    cloudinaryId?: string | null;
    category: string;
  }> = [];

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
    "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop"
  ];

  try {
    images = await getGalleryImages();
  } catch {
    // DB not configured yet.
    images = Array.from({ length: 18 }).map((_, i) => ({
      id: `ph-${i}`,
      title: "Styled Look",
      description: null,
      imageUrl: placeholderImages[i % placeholderImages.length],
      cloudinaryId: null,
      category: "personal"
    }));
  }

  return <GalleryClient images={images} />;
}


