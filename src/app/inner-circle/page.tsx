import type { Metadata } from "next";
import { WaitlistForm } from "@/components/WaitlistForm";

export const metadata: Metadata = {
  title: "Inner Circle by GRWTEE - Join the Waiting List",
  description:
    "Join the Inner Circle waiting list. Your wardrobe digitised, weekly looks pre-planned, and a stylist on call. Style, sorted."
};

const benefits = [
  {
    title: "Monthly wardrobe detox",
    body: "We audit what's working, retire what isn't."
  },
  {
    title: "Digital wardrobe",
    body: "Every piece you own, catalogued and searchable."
  },
  {
    title: "AI body model",
    body: "Preview outfits on a model shaped like you."
  },
  {
    title: "Weekly looks",
    body: "Curated outfits dropped into your week, ready to wear."
  },
  {
    title: "On-call styling",
    body: "A stylist on the other end of a message when you need one."
  }
];

export default function InnerCirclePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-dark via-purple-medium to-purple-dark text-white">
        <div className="container-shell relative z-10 py-20 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-accent text-xs font-semibold tracking-[0.3em] text-gold-light">
              INNER CIRCLE BY GRWTEE
            </p>
            <h1 className="mt-4 font-heading text-5xl font-semibold leading-tight md:text-6xl">
              Style, sorted.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-cream/90">
              Join the Inner Circle where your wardrobe is digitised, your
              outfits are pre-planned, and your everyday look is handled by a
              stylist who knows you.
            </p>
            <p className="mx-auto mt-4 max-w-lg text-base italic leading-7 text-cream/70">
              Your wardrobe, your week, your look - done for you.
            </p>
            <div className="mt-10">
              <a
                href="#join"
                className="inline-flex items-center justify-center rounded-full bg-white px-10 py-3.5 font-accent text-base font-semibold text-purple-dark transition hover:scale-[1.02] hover:bg-cream active:scale-[0.98]"
              >
                Join the Waiting List
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="pattern-light">
        <div className="container-shell py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-accent text-xs font-semibold tracking-[0.25em] text-green-dark">
              WHAT YOU GET INSIDE
            </p>
            <h2 className="mt-4 font-heading text-3xl font-semibold text-purple-dark md:text-4xl">
              Every month, sorted.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-gray-dark/80">
              Your wardrobe lives in the app. Your daily looks are picked for
              you. And you can see how an outfit fits on a model of your body
              before you ever put it on.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="rounded-xl border border-gray-medium/40 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <h3 className="font-heading text-lg font-semibold text-purple-dark">
                  {b.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-dark/80">
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="join"
        className="relative bg-gradient-to-br from-purple-dark to-purple-medium text-white"
      >
        <div className="container-shell py-16 md:py-24">
          <div className="mx-auto max-w-xl text-center">
            <p className="font-accent text-xs font-semibold tracking-[0.3em] text-gold-light">
              DOORS OPEN SOON
            </p>
            <h2 className="mt-4 font-heading text-3xl font-semibold md:text-4xl">
              Join the Waiting List
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-7 text-cream/90">
              Be first in when the Inner Circle opens. No spam - just the
              invitation when it's time.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur-sm md:p-8">
            <WaitlistForm variant="dark" source="inner-circle" />
            <p className="mt-4 text-center text-xs text-cream/70">
              We'll email you a confirmation. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
