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
              preferences.
            </p>
          </section>

          <section aria-labelledby="dna-heading">
            <h2 id="dna-heading" className="font-accent text-sm font-semibold tracking-wider text-green-dark">
              GRWTEE DNA
            </h2>
            <p className="mt-2 text-gray-dark/90">
              At GRWTEE, our styling philosophy is built on three defining pillars:
              Non-Conformity, Versatility, and Timelessness. These values shape how
              we approach style, identity, and expression.
            </p>
            <ul className="mt-6 list-none space-y-6 border-l-2 border-green-dark/20 pl-6">
              <li>
                <h3 className="font-accent text-sm font-semibold text-purple-dark">
                  Non-Conformity
                </h3>
                <p className="mt-1.5 text-gray-dark/90">
                  GRWTEE exists outside the pressure of trends. We believe personal
                  style should be intentional and independent. Our approach is rooted
                  in curating looks that reflect individuality, pieces and styling
                  choices that feel authentic rather than dictated by the moment.
                </p>
              </li>
              <li>
                <h3 className="font-accent text-sm font-semibold text-purple-dark">
                  Timeless
                </h3>
                <p className="mt-1.5 text-gray-dark/90">
                  To be of the moment while remaining beyond it. GRWTEE looks are
                  designed with longevity in mind, curated looks that can return years
                  later and still feel relevant, admired, and true. Fashion may
                  evolve, but true style holds its value across time.
                </p>
              </li>
              <li>
                <h3 className="font-accent text-sm font-semibold text-purple-dark">
                  Versatility
                </h3>
                <p className="mt-1.5 text-gray-dark/90">
                  Versatility at GRWTEE is about depth within identity. Rather than
                  redefining someone&apos;s style, we expand it. If your aesthetic is
                  chic, we explore every dimension of chic, from understated elegance
                  to bold expression. GRWTEE reveals the range within a style, allowing
                  it to evolve while remaining unmistakably yours.
                </p>
              </li>
            </ul>
          </section>
        </div>


        <div className="mt-12 flex justify-center gap-4">
          <a
            href="/services"
            className="inline-flex rounded-full bg-purple-dark px-8 py-3 font-accent font-semibold text-white transition hover:bg-purple-medium"
          >
            View Our Services
          </a>
          <a
            href="/book"
            className="inline-flex rounded-full bg-gold px-8 py-3 font-accent font-semibold text-white transition hover:bg-gold-light"
          >
            Book Now
          </a>
        </div>
      </div>
    </div>
  );
}


