import type { Metadata, Viewport } from "next";
// Self-hosted so the build never fetches Google Fonts, whose occasional extensionless
// font URLs fail the Turbopack build (vercel/next.js#99114). Families are named in globals.css.
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/playfair-display/wght.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@/styles/globals.css";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { Footer } from "@/components/layout/Footer";
import { FooterLoader } from "@/components/layout/FooterLoader";
import { Header } from "@/components/layout/Header";
import { StructuredData } from "@/components/StructuredData";
import { getConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: {
    default: "GRWTEE | Wardrobe Stylist | Creative Director",
    template: "%s | GRWTEE"
  },
  description:
    "GRWTEE (Get Ready With Tee) offers premium virtual and physical styling services in Lagos, Nigeria. Discover your signature style with our expert fashion consultants.",
  keywords: [
    "styling services Lagos",
    "fashion stylist Nigeria",
    "virtual styling",
    "personal shopper Lagos",
    "wardrobe consultant"
  ],
  authors: [{ name: "GRWTEE" }],
  creator: "GRWTEE",
  publisher: "GRWTEE",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "/",
    siteName: "GRWTEE",
    title: "GRWTEE | Wardrobe Stylist | Creative Director",
    description: "Premium styling services tailored to your unique style",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "GRWTEE" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "GRWTEE | Wardrobe Stylist | Creative Director",
    description: "Premium styling services tailored to your unique style",
    images: ["/og-image.svg"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  icons: {
    icon: [
      { url: "/favicon.svg" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "GRWTEE",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  themeColor: "#422064"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = await getConfig(
    "NEXT_PUBLIC_GA_MEASUREMENT_ID",
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  );

  return (
    <html lang="en">
      <body>
        <StructuredData />
        <AnalyticsProvider gaId={gaId} />
        <a href="#main-content" className="sr-only focus:not-sr-only">
          Skip to main content
        </a>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
        <FooterLoader />
      </body>
    </html>
  );
}


