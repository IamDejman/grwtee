import Link from "next/link";
import { FaqSection } from "@/components/faq/FaqAccordion";

export const metadata = {
  title: "Frequently Asked Questions",
  description: "Answers to common questions about GRWTEE services, booking, and policies."
};

const about = [
  {
    q: "What is GRWTEE?",
    a: "GRWTEE stands for Get Ready With Tee. We are a professional styling service that primarily offers virtual styling for convenience, but we also provide physical styling on request."
  },
  {
    q: "Do you sell clothes?",
    a: "No, we do not sell clothes directly. However, we offer personal shopping services where we source and purchase pieces based on the curated looks from your styling session."
  },
  {
    q: "Do you only style African brands?",
    a: "No. While we are passionate about promoting and showcasing African designers, we style across both local and international brands to suit your needs and preferences."
  }
];

const booking = [
  {
    q: "Are you available to travel?",
    a: "Yes, we are available to travel for styling. Availability may vary by country, and travel styling requests follow a defined process."
  },
  {
    q: "How do I book your services?",
    a: "Fill out the intake form through our link in bio or reach us via email/DM."
  },
  {
    q: "Do you offer express styling?",
    a: "Yes. Express styling is available at an additional cost for urgent or last-minute bookings."
  },
  {
    q: "Can I retain you for regular styling?",
    a: "Yes, through our Contract Styling service. Retain us weekly or monthly for a set number of curated looks."
  }
];

const payment = [
  {
    q: "What happens if I need to cancel my booking?",
    a: "All bookings are non-refundable, but you may reschedule within a specific timeframe. Contact us to arrange."
  },
  {
    q: "What are your payment terms?",
    a: "100% payment is required upfront before any service. All payments are strictly non-refundable."
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept payments in Naira or USD via Taj Bank (Naira) or Cashapp (USD). See Payment page for details."
  },
  {
    q: "How long does it take to receive my lookbook?",
    a: "Standard delivery: 6–10 working days. Express styling: 1–3 working days with a 20% surcharge."
  },
  {
    q: "Can I get revisions on my lookbook?",
    a: "Yes, up to a maximum of 3 rounds of revisions per booking."
  },
  {
    q: "Who pays for travel costs for physical styling?",
    a: "The client bears all travel, feeding, and accommodation expenses, payable upfront alongside the styling fee."
  }
];

const allFaqs = [
  { section: "About GRWTEE", items: about },
  { section: "Booking & Services", items: booking },
  { section: "Payment & Policies", items: payment }
];

export default function FAQPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaqs.flatMap(({ items }) =>
      items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a
        }
      }))
    )
  };

  return (
    <div className="pattern-light">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="container-shell py-16">
        <h1 className="animate-fade-in-up font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
          Frequently Asked Questions
        </h1>
        <p className="mt-2 font-body text-base text-gray-dark/80">
          Find answers to common questions about our services and policies.
        </p>

        <FaqSection title="ABOUT GRWTEE" items={about} sectionIndex={0} />
        <FaqSection title="BOOKING & SERVICES" items={booking} sectionIndex={1} />
        <FaqSection title="PAYMENT & POLICIES" items={payment} sectionIndex={2} />

        <div className="mt-12 animate-fade-in-up rounded-xl bg-green-dark p-8 text-center text-white">
          <h2 className="font-heading text-2xl font-semibold">
            Can’t find what you’re looking for?
          </h2>
          <p className="mt-2 text-white/90">
            We’re here to help. Reach out with any questions.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-flex rounded-full bg-gold px-8 py-3 font-accent font-semibold text-gray-dark transition hover:bg-gold-light"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
