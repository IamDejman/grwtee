export const metadata = {
  title: "Styling Rate Card",
  description: "Complete pricing for GRWTEE styling services."
};

const cards = [
  {
    title: "Virtual Personal Styling",
    lines: ["1 Look: $155 / ₦195,000", "A look includes accessories & styling suggestions", "5-12 Looks: 15% off total look"]
  },
  {
    title: "Virtual Wardrobe Styling",
    lines: ["1 Look: $120 / ₦140,000", "A look includes accessories & styling suggestions", "5-12 Looks: 15% off total look"]
  },
  {
    title: "Wardrobe Revamp (In-person)",
    lines: ["Base Rate: $540 / ₦450,000", "Covers first 2 hours", "₦100,000 per hour after first 2 hours"]
  },
  {
    title: "Virtual Event Styling",
    lines: ["Starting: $250 / ₦250,000 per look", "5-7 looks: 15% off total look", "Price subject to change due to event magnitude"]
  },
  {
    title: "Virtual Vacation Styling Packages",
    lines: ["Package: $550 / ₦650,000", "Includes: 5 looks"]
  },
  {
    title: "Express Styling",
    lines: ["Surcharge: Additional 20% of total look", "Available for urgent or last-minute bookings"]
  },
  {
    title: "Personal Shopping",
    lines: ["Commission: 15% off total purchase", "Styling service fees not included"]
  }
];

export default function PricingPage() {
  return (
    <div className="pattern-light">
      <div className="container-shell py-16">
        <h1 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
          Styling Rate Card
        </h1>
        <p className="mt-2 font-body text-base text-gray-dark/80">
          Premium services with transparent pricing.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div key={c.title} className="overflow-hidden rounded-xl shadow-md ring-1 ring-gray-medium/60">
              <div className="bg-purple-medium px-6 py-4">
                <h3 className="font-accent text-lg font-semibold text-white">
                  {c.title}
                </h3>
              </div>
              <div className="bg-teal-light/10 px-6 py-5">
                <ul className="space-y-2">
                  {c.lines.map((l, i) => (
                    <li key={i} className="text-sm text-gray-dark/90">
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-gray-medium/60 bg-white p-6">
          <h2 className="font-heading text-xl font-semibold text-purple-dark">
            Ready to Book?
          </h2>
          <div className="mt-3 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-gray-dark/80">Email: <a className="font-semibold text-teal-dark" href="mailto:grwteee@gmail.com">grwteee@gmail.com</a></p>
            <a
              href="/contact"
              className="inline-flex rounded-full bg-teal-dark px-8 py-3 font-accent font-semibold text-white transition hover:bg-purple-medium"
            >
              Contact Us
            </a>
          </div>
          <p className="mt-6 text-xs text-gray-dark/70">
            All services subject to Terms & Conditions — see{" "}
            <a className="font-semibold text-teal-dark hover:text-purple-dark" href="/payment">Payment Policies</a> &nbsp;and&nbsp;
            <a className="font-semibold text-teal-dark hover:text-purple-dark" href="/terms">Service Agreement</a>.
          </p>
        </div>
      </div>
    </div>
  );
}


