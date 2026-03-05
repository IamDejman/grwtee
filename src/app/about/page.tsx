export const metadata = {
  title: "About GRWTEE",
  description:
    "Get Ready With Tee - professional styling partner. Virtual styling first, physical styling on request."
};

export default function AboutPage() {
  return (
    <div className="pattern-light">
      <div className="container-shell py-16">
        <h1 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
          About GRWTEE
        </h1>
        <p className="mt-2 font-body text-base text-gray-dark/80">
          Get Ready With Tee - Your Personal Styling Partner
        </p>

        <div className="mt-8 space-y-8">
          <section>
            <h2 className="font-accent text-sm font-semibold tracking-wider text-green-dark">
              What is GRWTEE?
            </h2>
            <p className="mt-2 text-gray-dark/90">
              GRWTEE stands for Get Ready With Tee. We are a professional styling
              service that primarily offers virtual styling for convenience, but we
              also provide physical styling on request.
            </p>
          </section>

          <section>
            <h2 className="font-accent text-sm font-semibold tracking-wider text-green-dark">
              Our Mission
            </h2>
            <p className="mt-2 text-gray-dark/90">
              Our mission is to help you discover and express your personal style
              through curated looks tailored to your body type, lifestyle, and
              preferences. We style across both local and international brands,
              with a passion for promoting African designers.
            </p>
          </section>

          <section>
            <h2 className="font-accent text-sm font-semibold tracking-wider text-green-dark">
              What Sets Us Apart
            </h2>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-gray-dark/90">
              <li>Virtual styling for ultimate convenience</li>
              <li>Physical styling available on request</li>
              <li>Personal shopping services</li>
              <li>Event and vacation styling expertise</li>
              <li>Wardrobe management solutions</li>
              <li>Support for both local and international brands</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
            <div className="aspect-[3/2] rounded-lg bg-cream" />
            <p className="mt-3 text-sm text-gray-dark/70">
              Replace with professional styling images grid.
            </p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
            <p className="text-gray-dark/90">
              “GRWTEE helped me define my signature look — effortless and elevated.
              The virtual process was seamless.” — Client
            </p>
          </div>
        </div>

        <div className="mt-12 flex justify-center">
          <a
            href="/services"
            className="inline-flex rounded-full bg-green-dark px-8 py-3 font-accent font-semibold text-white transition hover:bg-purple-medium"
          >
            View Our Services
          </a>
        </div>
      </div>
    </div>
  );
}


