import { SubscribePageForm } from "@/components/SubscribePageForm";

export const metadata = {
  title: "Join the mailing list — GRWTEE",
  description:
    "Subscribe to the GRWTEE mailing list for styling stories, service drops, and exclusive updates."
};

const perks = [
  {
    title: "Styling stories",
    body: "Editorial notes and behind-the-scenes looks from client sessions and shoots."
  },
  {
    title: "Service drops",
    body: "First access to new offerings, limited slots, and seasonal packages."
  },
  {
    title: "The occasional edit",
    body: "Curated picks, trend reads, and practical wardrobe guidance — only when it's good."
  }
];

export default function SubscribePage() {
  return (
    <div className="pattern-light">
      <section className="container-shell py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-accent text-xs font-semibold tracking-[0.25em] text-green-dark">
            NEWSLETTER
          </p>
          <h1 className="mt-4 font-heading text-4xl font-semibold text-purple-dark md:text-5xl">
            Join the GRWTEE mailing list
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-gray-dark/80">
            Get ready with Tee — directly in your inbox. Styling stories, new
            services, and the occasional edit. No spam, unsubscribe anytime.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-gray-medium/40 bg-white p-6 shadow-sm md:p-8">
          <SubscribePageForm />
          <p className="mt-4 text-center text-xs text-gray-dark/60">
            We'll email you a confirmation link to verify your address.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-3">
          {perks.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-gray-medium/40 bg-cream-light/60 p-6"
            >
              <h3 className="font-heading text-lg font-semibold text-purple-dark">
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-dark/80">{p.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
