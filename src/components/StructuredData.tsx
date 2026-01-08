import { getConfig } from "@/lib/config";

export async function StructuredData() {
  const siteUrl = await getConfig("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL || "https://grwtee.com");
  const instagramUrl = await getConfig("NEXT_PUBLIC_INSTAGRAM_URL", process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/grwtee");
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "GRWTEE",
    description: "Professional styling services in Lagos, Nigeria",
    url: siteUrl,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Lagos",
      addressCountry: "NG"
    },
    priceRange: "$120 - $650",
    areaServed: { "@type": "Country", name: "Nigeria" },
    sameAs: [instagramUrl]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}


