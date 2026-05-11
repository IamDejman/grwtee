export const metadata = {
  title: "Payment & Policies",
  description: "Payment methods, terms, timelines, revisions, and policies."
};

export default function PaymentPage() {
  return (
    <div className="pattern-light">
      <div className="container-shell py-16">
        <h1 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
          Payment & Policies
        </h1>

        <div className="mt-8 space-y-8">
          <section className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
            <h2 className="font-accent text-sm font-semibold tracking-wider text-green-dark">
              Payment Methods
            </h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <p className="font-semibold text-gray-dark">Naira Payments</p>
                <ul className="mt-2 text-sm text-gray-dark/85">
                  <li>Bank: Taj Bank</li>
                  <li>Account Name: GRWTEE Fashion</li>
                  <li>Account Number: 0012481623</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-dark">USD Payments</p>
                <ul className="mt-2 text-sm text-gray-dark/85">
                  <li>Platform: Cashapp</li>
                  <li>Handle: $Nifemi31</li>
                </ul>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-dark/85">
              Contact: <a className="font-semibold text-green-dark" href="mailto:book@grwtee.com">book@grwtee.com</a>
            </p>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
            <h2 className="font-accent text-sm font-semibold tracking-wider text-green-dark">
              Payment Terms
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-gray-dark/85">
              <li>100% payment upfront required before any service.</li>
              <li>All payments are strictly non-refundable.</li>
              <li>Proof of payment must be sent to confirm booking.</li>
              <li>By making payment, you agree to our Terms & Conditions.</li>
            </ul>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
            <h2 className="font-accent text-sm font-semibold tracking-wider text-green-dark">
              Service Timelines
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-gray-dark/85">
              <li>Standard Lookbook Delivery: 6–10 working days after booking.</li>
              <li>Express Styling: 1–3 working days (20% surcharge).</li>
            </ul>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
            <h2 className="font-accent text-sm font-semibold tracking-wider text-green-dark">
              Revision Policy
            </h2>
            <p className="mt-3 text-sm text-gray-dark/85">
              Maximum 3 rounds of revisions per booking.
            </p>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
            <h2 className="font-accent text-sm font-semibold tracking-wider text-green-dark">
              Shopping & Purchase Policy
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-gray-dark/85">
              <li>Purchase recommended pieces within 24 hours of receiving lookbook.</li>
              <li>GRWTEE not responsible if items sell out after 24 hours.</li>
              <li>Alternative sourcing beyond 24 hours attracts additional charges.</li>
              <li>Personal Shopping: 15% commission; styling fees charged separately.</li>
            </ul>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
            <h2 className="font-accent text-sm font-semibold tracking-wider text-green-dark">
              Physical Styling Services: Travel
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-gray-dark/85">
              <li>Client bears all travel, feeding, and accommodation expenses.</li>
              <li>All costs must be paid upfront alongside styling fee.</li>
            </ul>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
            <h2 className="font-accent text-sm font-semibold tracking-wider text-green-dark">
              Intellectual Property
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-gray-dark/85">
              <li>All lookbooks, mood boards, and styling concepts remain GRWTEE property.</li>
              <li>Provided for personal use only; not for resale or commercial use without consent.</li>
            </ul>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
            <h2 className="font-accent text-sm font-semibold tracking-wider text-green-dark">
              Communication & Availability
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-gray-dark/85">
              <li>Delays from late client responses may extend delivery timelines.</li>
              <li>All consultations must be booked in advance; additional fees may apply for unscheduled availability.</li>
            </ul>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
            <h2 className="font-accent text-sm font-semibold tracking-wider text-green-dark">
              Additional Services
            </h2>
            <p className="mt-3 text-sm text-gray-dark/85">
              Requests outside agreed scope (last-minute additions, multi-event styling, extra looks) incur additional charges.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}


