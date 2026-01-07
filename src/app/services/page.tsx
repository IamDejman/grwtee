export const metadata = {
  title: "Styling Services",
  description:
    "Explore premium styling services: virtual personal styling, wardrobe revamp, event styling, vacation styling, photoshoot styling, and more."
};

const services = [
  {
    name: "Virtual Personal Styling",
    price: "Starting at: $155 / ₦195,000",
    description:
      "Curated looks tailored to your body type, lifestyle, and personal style. Ideal for everyday outfits, professional wear, or style upgrades.",
    note: "A look includes accessories and styling suggestions",
    priceNote: "5-12 Looks: 15% off total"
  },
  {
    name: "Virtual Wardrobe Styling",
    price: "Starting at: $120 / ₦140,000",
    description:
      "New looks styled using your existing wardrobe to create fresh, cohesive outfits without purchasing new items.",
    note: "A look includes accessories and styling suggestions",
    priceNote: "5-12 Looks: 15% off total"
  },
  {
    name: "Wardrobe Revamp (In-person)",
    price: "Starting at: $540 / ₦450,000",
    description:
      "Comprehensive review and refresh of your closet. Discover your style, edit your wardrobe, and identify essentials to fill gaps.",
    priceNote: "Base rate covers first 2 hours, then ₦100,000 per hour"
  },
  {
    name: "Virtual Event Styling",
    price: "Starting at: $250 / ₦250,000",
    description:
      "Custom looks for special occasions — birthdays, launches, red carpet events, or private functions.",
    note: "Price subject to change due to event magnitude",
    priceNote: "5-7 looks: 15% off total"
  },
  {
    name: "Photoshoot Styling",
    price: "Contact for Quote",
    description:
      "Looks for birthday shoots, brand shoots, pre-wedding shoots, and more, tailored to your creative direction."
  },
  {
    name: "Virtual Vacation Styling",
    price: "Package: $550 / ₦650,000 (5 looks)",
    description:
      "Head-to-toe looks for your trip — travel days, excursions, dinners, and beach-wear — tailored to destination and itinerary."
  },
  {
    name: "Personal Shopping (NEW)",
    price: "Commission: 15% off total purchase",
    description:
      "We source and purchase pieces based on curated looks. Styling fees not included; charged separately.",
    note: "Styling service fees are not included and are charged separately"
  }
];

export default function ServicesPage() {
  return (
    <div className="pattern-light">
      <div className="container-shell py-16">
        <h1 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
          Styling Services
        </h1>
        <p className="mt-2 font-body text-base text-gray-dark/80">
          Professional styling services tailored to your needs.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {services.map((s) => (
            <div
              key={s.name}
              className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60"
            >
              <h3 className="font-heading text-2xl font-medium text-purple-medium">
                {s.name}
              </h3>
              <p className="mt-1 font-accent text-sm font-semibold text-gold">
                {s.price}
              </p>
              <p className="mt-3 text-gray-dark/85">{s.description}</p>
              {s.note ? (
                <p className="mt-2 text-sm italic text-gray-dark/70">{s.note}</p>
              ) : null}
              {s.priceNote ? (
                <p className="mt-2 text-sm font-semibold text-teal-dark">
                  {s.priceNote}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl bg-teal-dark p-8 text-center text-white">
          <h2 className="font-heading text-2xl font-semibold">
            Ready to Get Started?
          </h2>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/pricing"
              className="rounded-full bg-gold px-8 py-3 font-accent font-semibold text-gray-dark transition hover:bg-gold-light"
            >
              View Complete Pricing
            </a>
            <a
              href="/contact"
              className="rounded-full border border-white px-8 py-3 font-accent font-semibold transition hover:bg-white hover:text-teal-dark"
            >
              Book a Consultation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}


