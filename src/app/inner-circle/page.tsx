import type { Metadata } from "next";
import { WaitlistForm } from "@/components/WaitlistForm";
import { FaqSection } from "@/components/faq/FaqAccordion";

export const metadata: Metadata = {
  title: "Inner Circle by GRWTEE - Join the Waiting List",
  description:
    "Join the Inner Circle waiting list. Your wardrobe digitised, weekly looks pre-planned, and a stylist on call. Style, sorted."
};

const faqItems = [
  {
    q: "What is Inner Circle by GRWTEE?",
    a: "It's a membership that takes your wardrobe off your to-do list. We digitise what you own, plan your weekly looks, give you an AI fit-room to preview outfits on a model of your body, and connect you to a stylist when you want a human in the loop."
  },
  {
    q: "Who is it for?",
    a: "Anyone who's tired of standing in front of a full wardrobe with nothing to wear. Whether you're rebuilding your style, dressing for a new role, or just want your mornings back - Inner Circle is built for you."
  },
  {
    q: "How does the digital wardrobe work?",
    a: "Upload or snap your clothes. We tag, organise, and make every piece searchable so you can build outfits in seconds - from your phone, anywhere."
  },
  {
    q: "What is the AI body model?",
    a: "A digital model shaped to your measurements. Before you commit to an outfit (or a purchase), you see how it actually sits on your body - not a generic mannequin."
  },
  {
    q: "Tell me about the three tiers.",
    a: "Each tier scales how much of your styling we handle - from a self-serve digital wardrobe at the entry level, up to fully managed weekly looks and on-call stylist access at the top. Full breakdown drops when doors open. Waiting list members see it first."
  },
  {
    q: "How much does it cost?",
    a: "Pricing is locked in for waiting list members at launch - and it's lower than what we'll charge publicly. We'll share the full numbers in your invite email."
  },
  {
    q: "When does the waiting list open?",
    a: "Soon. The first cohort is small and invite-only - joining the list is how you get in."
  },
  {
    q: "Will I get bumped if I'm on the list?",
    a: "No. List order is honoured. The earlier you join, the earlier your invite."
  },
  {
    q: "Do I have to commit when I sign up?",
    a: "Not at all. Joining the waiting list is free and there's no obligation. You'll get an invite when a spot opens - say yes or pass, no pressure."
  },
  {
    q: "What about my photos and data?",
    a: "Your wardrobe, your photos, your measurements - all private to you. We don't sell data, and your stylist only sees what's needed to do their job. Full privacy policy at launch."
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Memberships are month-to-month. No long contracts."
  },
  {
    q: "I have a question that's not here.",
    a: "Reply to your waiting list confirmation email - it lands in our inbox and we read every one."
  }
];

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

      <section className="bg-cream-light/40">
        <div className="container-shell py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-accent text-xs font-semibold tracking-[0.25em] text-green-dark">
              FAQ
            </p>
            <h2 className="mt-4 font-heading text-3xl font-semibold text-purple-dark md:text-4xl">
              Frequently asked questions
            </h2>
          </div>
          <div className="mx-auto mt-10 max-w-3xl">
            <FaqSection title="" items={faqItems} sectionIndex={0} />
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
