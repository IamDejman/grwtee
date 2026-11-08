import { getConfig } from "@/lib/config";
import { httpUrlOr, jsonLd } from "@/lib/json-ld";

const DEFAULT_SITE_URL = "https://grwtee.com";
const DEFAULT_INSTAGRAM_URL = "https://instagram.com/grwtee";

export async function StructuredData() {
  // Both can be edited in the dashboard, so they're checked before use.
  const siteUrl = httpUrlOr(
    await getConfig("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL),
    DEFAULT_SITE_URL
  );
  const instagramUrl = httpUrlOr(
    await getConfig("NEXT_PUBLIC_INSTAGRAM_URL", process.env.NEXT_PUBLIC_INSTAGRAM_URL),
    DEFAULT_INSTAGRAM_URL
  );

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

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />;
}
