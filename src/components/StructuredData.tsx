export function StructuredData() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "GRWTEE",
    description: "Professional styling services in Lagos, Nigeria",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://grwtee.com",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Lagos",
      addressCountry: "NG"
    },
    priceRange: "$120 - $650",
    areaServed: { "@type": "Country", name: "Nigeria" },
    sameAs: [process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/grwtee"]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}


