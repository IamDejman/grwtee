import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@grwtee.com";
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
        "Curated looks tailored to your body type, lifestyle, and personal style.",
      priceUSD: 155,
      priceNGN: 195000,
      featured: true,
      order: 1
    },
    {
      name: "Virtual Wardrobe Styling",
      slug: "virtual-wardrobe-styling",
      description:
        "New looks styled using your existing wardrobe to create fresh, cohesive outfits.",
      priceUSD: 120,
      priceNGN: 140000,
      featured: true,
      order: 2
    },
    {
      name: "Wardrobe Revamp (In-person)",
      slug: "wardrobe-revamp",
      description:
        "Comprehensive review and refresh of your closet to create a functional wardrobe.",
      priceUSD: 540,
      priceNGN: 450000,
      featured: false,
      order: 3
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
    ...(process.env.SMTP_HOST && { SMTP_HOST: process.env.SMTP_HOST }),
    ...(process.env.SMTP_PORT && { SMTP_PORT: process.env.SMTP_PORT }),
    ...(process.env.SMTP_USER && { SMTP_USER: process.env.SMTP_USER }),
    ...(process.env.SMTP_PASSWORD && { SMTP_PASSWORD: process.env.SMTP_PASSWORD }),
    ...(process.env.CONTACT_EMAIL && { CONTACT_EMAIL: process.env.CONTACT_EMAIL }),
    ...(process.env.NEXT_PUBLIC_SITE_URL && { NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL }),
    ...(process.env.NEXT_PUBLIC_INSTAGRAM_URL && { NEXT_PUBLIC_INSTAGRAM_URL: process.env.NEXT_PUBLIC_INSTAGRAM_URL }),
    ...(process.env.NEXT_PUBLIC_CONTACT_EMAIL && { NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL })
  };

  for (const [key, value] of Object.entries(envDefaults)) {
    await prisma.siteSettings.upsert({
      where: { key: `env_${key}` },
      update: {}, // Don't overwrite existing values
      create: { key: `env_${key}`, value }
    });
  }

  console.log("✅ Seeded admin user and services");
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


