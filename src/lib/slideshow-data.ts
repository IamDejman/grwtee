/**
 * Shared slideshow/portfolio content. Used by the home slideshow and the gallery (portfolio) grid.
 */

export type SlideCategory = "Styled Look" | "Styling Session";

export type Slide =
  | { type: "image"; src: string; alt: string; title: string; description: string; category: SlideCategory }
  | { type: "video"; src: string; alt: string; title: string; description: string; category: SlideCategory };

export const slides: Slide[] = [
  {
    type: "image",
    src: "/slideshow/005353F3-B82C-464A-AFE3-8AB9F61E57DB.jpeg",
    alt: "Styled Look",
    title: "Curated outfit",
    description: "Everyday elegance tailored to your lifestyle.",
    category: "Styled Look",
  },
  {
    type: "image",
    src: "/slideshow/524B424F-2713-4F70-8B6F-3B24632AD5EB.jpeg",
    alt: "Styled Look",
    title: "Wardrobe essentials",
    description: "Foundational pieces that mix and match.",
    category: "Styled Look",
  },
  {
    type: "image",
    src: "/slideshow/58EC7F53-EC7B-4852-B11B-7EFAD73428EB.jpeg",
    alt: "Styled Look",
    title: "Statement look",
    description: "Bold choices for special moments.",
    category: "Styled Look",
  },
  {
    type: "image",
    src: "/slideshow/768DE20C-075C-4C39-BC0D-B5DBE5BDF695.jpeg",
    alt: "Styled Look",
    title: "Personal style",
    description: "Reflecting your unique personality.",
    category: "Styled Look",
  },
  {
    type: "image",
    src: "/slideshow/8E80C382-A5CB-40E8-849E-53E60E78E247.jpeg",
    alt: "Styled Look",
    title: "Edited silhouette",
    description: "Dressing to flatter and empower.",
    category: "Styled Look",
  },
  {
    type: "video",
    src: "/slideshow/slideshow-video.mp4",
    alt: "Styling Session",
    title: "Behind the scenes",
    description: "A glimpse into the styling process.",
    category: "Styling Session",
  },
  {
    type: "image",
    src: "/slideshow/F43DC580-D67E-4AE2-B6A5-732EBEB1289E.jpeg",
    alt: "Styled Look",
    title: "Refined casual",
    description: "Effortless style for every day.",
    category: "Styled Look",
  },
  {
    type: "image",
    src: "/slideshow/IMG_9925.jpeg",
    alt: "Styled Look",
    title: "Head-to-toe look",
    description: "Complete outfits curated for you.",
    category: "Styled Look",
  },
  {
    type: "image",
    src: "/slideshow/d2de7734-13a0-4251-ba0c-c21b08124766.jpeg",
    alt: "Styled Look",
    title: "Seasonal edit",
    description: "Trend-aware pieces that last.",
    category: "Styled Look",
  },
  {
    type: "video",
    src: "/slideshow/IMG_0391.MP4",
    alt: "Styling Session",
    title: "Styling in action",
    description: "See how we put looks together.",
    category: "Styling Session",
  },
];

export const slideCategories: SlideCategory[] = ["Styled Look", "Styling Session"];
