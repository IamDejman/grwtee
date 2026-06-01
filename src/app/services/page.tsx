import { getServicesCached } from "@/lib/cached";

export const metadata = {
  title: "Styling Services",
  description:
    "Explore premium styling services: virtual personal styling, wardrobe revamp, event styling, vacation styling, photoshoot styling, and more."
};

export default async function ServicesPage() {
  const services = await getServicesCached();

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
              key={s.id}
              className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60"
            >
              <h3 className="font-heading text-2xl font-medium text-purple-medium">
                {s.name}
              </h3>
              <p className="mt-3 text-gray-dark/85">{s.description}</p>
              <p className="mt-3 text-sm font-semibold text-green-dark">
                Rates are available on request.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl bg-purple-dark p-8 text-center text-white">
          <h2 className="font-heading text-2xl font-semibold">
            Ready to Get Started?
          </h2>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/book"
              className="rounded-full border border-white px-8 py-3 font-accent font-semibold transition hover:bg-white hover:text-purple-dark"
            >
              Book Now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}


