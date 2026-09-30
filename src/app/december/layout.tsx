import { Cormorant_Garamond } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-cormorant",
  display: "swap"
});

export default function DecemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${cormorant.variable} touch-manipulation bg-night [color-scheme:dark] [&_:focus-visible]:outline-gold [&_[tabindex='-1']:focus-visible]:outline-none`}
    >
      {children}
    </div>
  );
}
