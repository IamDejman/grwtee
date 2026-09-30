import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Consultation",
  description: "Tell us about your styling needs and book a consultation with GRWTEE."
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
