import { PortfolioGrid } from "@/components/gallery/PortfolioGrid";

export const metadata = {
  title: "Portfolio",
  description:
    "A curated showcase of our styling work.",
};

export default function PortfolioPage() {
  return (
    <div className="pattern-light">
      <div className="container-shell py-16">
        <h1 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
          Portfolio
        </h1>
        <p className="mt-2 font-body text-base text-gray-dark/80">
          A curated showcase of our styling work.
        </p>

        <PortfolioGrid />
      </div>
    </div>
  );
}
