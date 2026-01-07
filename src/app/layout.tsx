import type { Metadata } from "next";
import { Inter, Playfair_Display, Poppins } from "next/font/google";
import "@/styles/globals.css";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { StructuredData } from "@/components/StructuredData";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap"
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap"
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
  display: "swap"
});

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
    icon: [{ url: "/favicon.svg" }]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} ${poppins.variable}`}
    >
      <body>
        <StructuredData />
        <a href="#main-content" className="sr-only focus:not-sr-only">
          Skip to main content
        </a>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}


