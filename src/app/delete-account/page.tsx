import { DeleteAccountForm } from "@/components/DeleteAccountForm";

export const metadata = {
  title: "Delete your GRWTEE account",
  description: "How to delete your GRWTEE app account and the information in it, in the app or from this page."
};

export default function DeleteAccountPage() {
  return (
    <div className="pattern-light">
      <div className="container-shell py-16">
        <h1 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
          Delete your GRWTEE account
        </h1>

        <div className="mt-8 max-w-3xl space-y-8 text-[16px] leading-8 text-gray-dark/90">
          <section>
            <h2 className="font-accent text-lg font-semibold text-purple-medium">In the app</h2>
            <p className="mt-2">
              Open the GRWTEE app and go to <strong>Profile &rarr; Privacy &amp; data &rarr; Delete account</strong>.
              Your account is deleted straight away.
            </p>
          </section>

          <section>
            <h2 className="font-accent text-lg font-semibold text-purple-medium">Can&apos;t open the app?</h2>
            <p className="mt-2">
              Enter the email address you use in the app. We&apos;ll email it a link; open the link to confirm and the
              account is deleted.
            </p>
            <div className="mt-4 max-w-md">
              <DeleteAccountForm />
            </div>
          </section>

          <section>
            <h2 className="font-accent text-lg font-semibold text-purple-medium">What&apos;s deleted</h2>
            <p className="mt-2">
              Your profile and style details, photos, wardrobe, lookbooks, calendar plans, messages, comments, likes and
              saves, try-on photos and images, and your reports and blocks. They&apos;re removed from our systems
              straight away; copies in our providers&apos; backups are removed as those backups expire.
            </p>
            <p className="mt-3">
              Enquiries, bookings, invoices and newsletter sign-ups made on this website aren&apos;t part of the app
              account. To ask about those, email{" "}
              <a className="font-semibold text-green-dark" href="mailto:book@grwtee.com">
                book@grwtee.com
              </a>
              . See our{" "}
              <a className="font-semibold text-green-dark" href="/privacy">
                Privacy Policy
              </a>{" "}
              for more.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
