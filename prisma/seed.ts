import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = "book@grwtee.com";
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error(
      "Missing ADMIN_SEED_PASSWORD (min 8 chars). Set it in your environment before running `npx prisma db seed`."
    );
  }
  const hashed = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashed,
      name: "GRWTEE Admin"
    }
  });

  const services = [
    {
      name: "Virtual Personal Styling",
      slug: "virtual-personal-styling",
      description:
        "Curated looks tailored to your body type, lifestyle, and personal style. Ideal for everyday outfits, professional wear, or style upgrades.",
      priceUSD: 155,
      priceNGN: 195000,
      featured: true,
      order: 1
    },
    {
      name: "Virtual Wardrobe Styling",
      slug: "virtual-wardrobe-styling",
      description:
        "New looks styled using your existing wardrobe to create fresh, cohesive outfits without purchasing new items.",
      priceUSD: 120,
      priceNGN: 140000,
      featured: true,
      order: 2
    },
    {
      name: "Wardrobe Revamp (In-person)",
      slug: "wardrobe-revamp",
      description:
        "Comprehensive review and refresh of your closet. Discover your style, edit your wardrobe, and identify essentials to fill gaps.",
      priceUSD: 540,
      priceNGN: 450000,
      featured: false,
      order: 3
    },
    {
      name: "Virtual Event Styling",
      slug: "virtual-event-styling",
      description:
        "Custom looks for special occasions — birthdays, launches, red carpet events, or private functions.",
      priceUSD: null,
      priceNGN: null,
      priceNote: "Rates are available on request.",
      featured: false,
      order: 4
    },
    {
      name: "Photoshoot Styling",
      slug: "photoshoot-styling",
      description:
        "Looks for birthday shoots, brand shoots, pre-wedding shoots, and more, tailored to your creative direction.",
      priceUSD: null,
      priceNGN: null,
      priceNote: "Rates are available on request.",
      featured: false,
      order: 5
    },
    {
      name: "Virtual Vacation Styling",
      slug: "virtual-vacation-styling",
      description:
        "Head-to-toe looks for your trip — travel days, excursions, dinners, and beach-wear — tailored to destination and itinerary.",
      priceUSD: null,
      priceNGN: null,
      priceNote: "Rates are available on request.",
      featured: false,
      order: 6
    },
    {
      name: "Contract Styling",
      slug: "contract-styling",
      description:
        "Become a Grwtee contract client and have your looks professionally planned and curated for you. With weekly or monthly styling, we make sure your outfits are always sorted for your lifestyle and everyday moments. Our team works with your personal style and preferences to keep you looking confident, consistent, and effortlessly stylish—without the stress of deciding what to wear.",
      priceUSD: null,
      priceNGN: null,
      priceNote: "Rates are available on request.",
      featured: false,
      order: 7
    }
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: {},
      create: s
    });
  }

  // Seed environment variables into database (optional - can be set via admin panel)
  // These will be used instead of env vars when set
  const envDefaults: Record<string, string> = {
    // Only set if not already in DB and env var exists
    ...(process.env.NEXTAUTH_SECRET && { NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET }),
    ...(process.env.NEXTAUTH_URL && { NEXTAUTH_URL: process.env.NEXTAUTH_URL }),
    ...(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && { NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME }),
    ...(process.env.CLOUDINARY_API_KEY && { CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY }),
    ...(process.env.CLOUDINARY_API_SECRET && { CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET }),
    ...(process.env.RESEND_API_KEY && { RESEND_API_KEY: process.env.RESEND_API_KEY }),
    ...(process.env.RESEND_FROM && { RESEND_FROM: process.env.RESEND_FROM }),
    ...(process.env.CONTACT_EMAIL && { CONTACT_EMAIL: process.env.CONTACT_EMAIL }),
    ...(process.env.NEXT_PUBLIC_SITE_URL && { NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL }),
    ...(process.env.NEXT_PUBLIC_INSTAGRAM_URL && { NEXT_PUBLIC_INSTAGRAM_URL: process.env.NEXT_PUBLIC_INSTAGRAM_URL }),
    ...(process.env.NEXT_PUBLIC_CONTACT_EMAIL && { NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL }),
    ...(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && { NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID })
  };

  for (const [key, value] of Object.entries(envDefaults)) {
    await prisma.siteSettings.upsert({
      where: { key: `env_${key}` },
      update: {}, // Don't overwrite existing values
      create: { key: `env_${key}`, value }
    });
  }

  // Seed gallery with existing slideshow images (local URLs; cloudinaryId "local/..." skips Cloudinary delete)
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "https://www.grwtee.com";
  const gallerySeed = [
    { path: "/slideshow/005353F3-B82C-464A-AFE3-8AB9F61E57DB.jpeg", title: "Curated outfit", description: "Everyday elegance tailored to your lifestyle.", category: "personal" },
    { path: "/slideshow/524B424F-2713-4F70-8B6F-3B24632AD5EB.jpeg", title: "Wardrobe essentials", description: "Foundational pieces that mix and match.", category: "wardrobe" },
    { path: "/slideshow/58EC7F53-EC7B-4852-B11B-7EFAD73428EB.jpeg", title: "Statement look", description: "Bold choices for special moments.", category: "event" },
    { path: "/slideshow/768DE20C-075C-4C39-BC0D-B5DBE5BDF695.jpeg", title: "Personal style", description: "Reflecting your unique personality.", category: "personal" },
    { path: "/slideshow/8E80C382-A5CB-40E8-849E-53E60E78E247.jpeg", title: "Edited silhouette", description: "Dressing to flatter and empower.", category: "personal" },
    { path: "/slideshow/F43DC580-D67E-4AE2-B6A5-732EBEB1289E.jpeg", title: "Refined casual", description: "Effortless style for every day.", category: "personal" },
    { path: "/slideshow/IMG_9925.jpeg", title: "Head-to-toe look", description: "Complete outfits curated for you.", category: "personal" },
    { path: "/slideshow/d2de7734-13a0-4251-ba0c-c21b08124766.jpeg", title: "Seasonal edit", description: "Trend-aware pieces that last.", category: "vacation" },
  ];
  for (let i = 0; i < gallerySeed.length; i++) {
    const { path, title, description, category } = gallerySeed[i];
    const imageUrl = `${baseUrl.replace(/\/$/, "")}${path}`;
    const cloudinaryId = `local/seed-${i + 1}`;
    await prisma.galleryImage.upsert({
      where: { id: `seed-gallery-${i + 1}` },
      update: {},
      create: {
        id: `seed-gallery-${i + 1}`,
        title,
        description,
        imageUrl,
        cloudinaryId,
        category,
        featured: i < 3,
        order: i,
      },
    });
  }

  console.log("✅ Seeded admin user and services");
  console.log("✅ Seeded gallery with slideshow images");
  console.log("✅ Environment variables copied to database (if env vars were set)");
  console.log("💡 You can manage env vars through the admin panel at /admin/settings");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


