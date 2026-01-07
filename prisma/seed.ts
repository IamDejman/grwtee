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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


