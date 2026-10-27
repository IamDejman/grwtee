import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Service Agreement & Terms",
  description: "Full service agreement and terms for GRWTEE."
};

export default function TermsPage() {
  return (
    <div className="pattern-light">
      <div className="container-shell py-16">
        <h1 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
          Service Agreement & Terms
        </h1>

        <div className="mt-8 max-w-3xl space-y-8 text-[16px] leading-8 text-gray-dark/90">
          <section>
            <h2 className="font-accent text-lg font-semibold text-purple-medium">
              1. Scope of Services
            </h2>
            <p className="mt-2">
              GRWTEE provides virtual and physical styling services as agreed in the service request or proposal.
            </p>
          </section>
          <section>
            <h2 className="font-accent text-lg font-semibold text-purple-medium">
              2. Deliverables
            </h2>
            <p className="mt-2">
              Deliverables include lookbooks, mood boards, and styling recommendations as specified per service.
            </p>
          </section>
          <section>
            <h2 className="font-accent text-lg font-semibold text-purple-medium">
              3. Timelines
            </h2>
            <p className="mt-2">3.1 Lookbook Delivery: 6–10 working days after booking.</p>
            <p>3.2 Express Styling: 1–3 working days (20% surcharge).</p>
          </section>
          <section>
            <h2 className="font-accent text-lg font-semibold text-purple-medium">
              4. Terms of Payment
            </h2>
            <p className="mt-2">100% upfront payment is required before commencement of any service.</p>
          </section>
          <section>
            <h2 className="font-accent text-lg font-semibold text-purple-medium">
              5. Revision Policy
            </h2>
            <p className="mt-2">A maximum of 3 rounds of revisions per booking.</p>
          </section>
          <section>
            <h2 className="font-accent text-lg font-semibold text-purple-medium">
              6. Shopping & Purchase Policy
            </h2>
            <p className="mt-2">
              Purchase recommended items within 24 hours of receiving your lookbook to avoid sellouts.
            </p>
          </section>
          <section>
            <h2 className="font-accent text-lg font-semibold text-purple-medium">
              7. Physical Styling Services
            </h2>
            <p className="mt-2">
              Client bears travel, feeding, and accommodation costs upfront alongside styling fee.
            </p>
          </section>
          <section>
            <h2 className="font-accent text-lg font-semibold text-purple-medium">
              8. Intellectual Property
            </h2>
            <p className="mt-2">
              All lookbooks, mood boards, and styling concepts remain property of GRWTEE unless otherwise agreed.
            </p>
          </section>
          <section>
            <h2 className="font-accent text-lg font-semibold text-purple-medium">
              9. Confidentiality
            </h2>
            <p className="mt-2">We maintain confidentiality for client information and materials.</p>
          </section>
          <section>
            <h2 className="font-accent text-lg font-semibold text-purple-medium">
              10. Communication & Availability
            </h2>
            <p className="mt-2">
              Delays from late responses may extend timelines. Availability outside scheduled sessions is not guaranteed.
            </p>
          </section>
          <section>
            <h2 className="font-accent text-lg font-semibold text-purple-medium">
              11. Additional Services
            </h2>
            <p className="mt-2">Requests outside the agreed scope incur additional charges.</p>
          </section>
          <section>
            <h2 className="font-accent text-lg font-semibold text-purple-medium">
              12. Using the GRWTEE App
            </h2>
            <p className="mt-2">
              12.1 Accounts: New accounts are reviewed by your stylist before you can use the app. Keep your sign-in
              details to yourself; you&apos;re responsible for what happens on your account.
            </p>
            <p>
              12.2 What you post: You&apos;re responsible for the comments, messages and photos you add. There is no
              place in the app for content that is abusive, hateful, sexual, violent, illegal or that infringes
              someone else&apos;s rights, and no tolerance for harassing other people.
            </p>
            <p>
              12.3 Reporting and blocking: You can report content and block other people from within the app. We
              review reports, and may remove content or close accounts that break these terms.
            </p>
            <p>
              12.4 AI features: Virtual try-on, auto-tagging and background removal use outside AI services and can get
              things wrong. Their results are a guide, not a promise of fit, colour or availability. See our{" "}
              <a className="font-semibold text-green-dark" href="/privacy">Privacy Policy</a> for what they receive.
            </p>
            <p>
              12.5 Deleting your account: You can delete your account at any time in Profile &rarr; Privacy &amp; data,
              or <a className="font-semibold text-green-dark" href="/delete-account">on our website</a>.
            </p>
          </section>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="/api/terms/pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-gray-medium/60 px-6 py-2 font-accent font-semibold text-gray-dark hover:border-green-dark hover:text-green-dark transition"
            >
              Download PDF Version
            </a>
            <p className="text-sm text-gray-dark/70">
              Last Updated: {formatDate(new Date())}
            </p>
            <p className="text-sm text-gray-dark/70">
              Contact for Questions:{" "}
              <a className="font-semibold text-green-dark" href="mailto:book@grwtee.com">
                book@grwtee.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


