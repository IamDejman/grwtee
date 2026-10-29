export const metadata = {
  title: "Privacy Policy",
  description: "What GRWTEE collects through the website and the app, why, who it's shared with, and your choices."
};

// Bump when the policy changes; shown at the bottom of the page.
const LAST_UPDATED = "27 October 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-accent text-lg font-semibold text-purple-medium">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="pattern-light">
      <div className="container-shell py-16">
        <h1 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
          Privacy Policy
        </h1>

        <div className="mt-8 max-w-3xl space-y-8 text-[16px] leading-8 text-gray-dark/90">
          <p>
            This policy explains what GRWTEE (&ldquo;we&rdquo;) collects when you use this website and the GRWTEE app,
            why, who we share it with, and the choices you have. If you have a question, email{" "}
            <a className="font-semibold text-green-dark" href="mailto:book@grwtee.com">book@grwtee.com</a>.
          </p>

          <Section title="1. What we collect on the website">
            <p>
              <strong>Booking and contact forms:</strong> your name, email address, phone number, the service you&apos;re
              interested in and your message.
            </p>
            <p>
              <strong>December styling sessions:</strong> your name, email, WhatsApp number, country and timezone, the
              occasions and events you&apos;re dressing for, your style notes and any links you share, and the time you
              book.
            </p>
            <p>
              <strong>Newsletter and Inner Circle waitlist:</strong> your email address and, for the waitlist, your name.
              You confirm the newsletter by email and every newsletter has an unsubscribe link.
            </p>
            <p>
              <strong>Invoices:</strong> the name and address we bill and what the invoice is for.
            </p>
            <p>
              <strong>Usage:</strong> with Google Analytics we count page visits and how the site is used, using cookies.
              We don&apos;t load it on booking-management links or our admin pages.
            </p>
          </Section>

          <Section title="2. What we collect in the app">
            <p>
              <strong>Your account:</strong> your name, username, email, phone and contact number, country and timezone,
              and your password (stored only as a secure hash by our sign-in provider).
            </p>
            <p>
              <strong>Your style profile:</strong> what you tell us in the style quiz and your profile, such as body shape,
              height, weight range, sizes, style preferences, location, bio, Instagram handle and profile photo.
            </p>
            <p>
              <strong>What you add:</strong> wardrobe photos and details, lookbooks, calendar plans and events, messages
              and photos you send your stylist, comments, likes and saves, and photos you use for virtual try-on with the
              images it creates.
            </p>
            <p>
              <strong>Your device:</strong> a push notification token, if you allow notifications.
            </p>
            <p>
              <strong>Reports and blocks:</strong> what you report and why, and who you&apos;ve blocked.
            </p>
          </Section>

          <Section title="3. How we use it">
            <p>
              To provide our styling services and the app: to reply to enquiries, schedule and run sessions, send
              invoices, build your lookbooks and plans, and let you message your stylist. New app accounts are reviewed
              by your stylist before they can be used.
            </p>
            <p>
              To send you emails you&apos;d expect, such as booking confirmations, sign-in codes and, if you subscribed,
              our newsletter. To keep the service safe, for example to stop spam and abuse and to review reported content.
            </p>
            <p>We don&apos;t sell your information, and we don&apos;t use it for advertising.</p>
          </Section>

          <Section title="4. AI features in the app">
            <p>
              Some app features send your photos to other companies. The app asks before the first photo goes to each
              one, and you can turn each off any time in Profile &rarr; Privacy &amp; data:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Virtual try-on</strong> sends your photo and the garment photos from the look to Fashn.ai, which
                creates the try-on image.
              </li>
              <li>
                <strong>Auto-tagging</strong> sends a wardrobe photo to Anthropic, which runs the Claude AI model, to
                suggest a name, category, colours and tags.
              </li>
              <li>
                <strong>Background removal</strong> sends a photo to remove.bg (Kaleido AI), which returns it with the
                background removed.
              </li>
            </ul>
            <p>
              Product search sends the words you search for (not photos) to SerpApi, which looks up products on Google
              Shopping.
            </p>
          </Section>

          <Section title="5. Who we share it with">
            <p>We use these service providers to run GRWTEE. They process information on our behalf:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Supabase: the app&apos;s database, sign-in and photo storage.</li>
              <li>Vercel and Railway: hosting for the website and the app&apos;s server.</li>
              <li>Resend: sending our emails.</li>
              <li>Expo: delivering push notifications.</li>
              <li>Google: Analytics on the website, and Google Calendar and Meet for December sessions.</li>
              <li>Cloudflare: Turnstile, which checks that forms are sent by people rather than bots.</li>
              <li>Cloudinary: storing and serving images on the website.</li>
              <li>Fashn.ai, Anthropic, remove.bg and SerpApi: the app features in section 4.</li>
            </ul>
            <p>
              Your stylist sees your profile, wardrobe, lookbooks, messages and reports so they can style you. We may
              also share information if the law requires it.
            </p>
            <p>
              Some of these providers process information outside Nigeria, including in the United States and the
              European Union.
            </p>
          </Section>

          <Section title="6. How long we keep it">
            <p>
              App account information is kept until you delete your account. Deleting it removes your profile, photos,
              wardrobe, lookbooks, plans, messages, comments and try-ons from our systems straight away; copies in our
              providers&apos; backups are removed as those backups expire.
            </p>
            <p>
              Enquiries, bookings and invoices are kept as long as we need them for the service and our records. Newsletter
              addresses are kept until you unsubscribe, and waitlist entries until you ask us to remove them.
            </p>
          </Section>

          <Section title="7. Your choices and rights">
            <p>
              You can see and change most of your information in the app. You can delete your app account in Profile
              &rarr; Privacy &amp; data, or{" "}
              <a className="font-semibold text-green-dark" href="/delete-account">delete it on our website</a> if you
              can&apos;t open the app.
            </p>
            <p>
              You can also ask us for a copy of your information, to correct it, to delete it, or to stop using it for
              something, by emailing{" "}
              <a className="font-semibold text-green-dark" href="mailto:book@grwtee.com">book@grwtee.com</a>. You can
              unsubscribe from the newsletter with the link in any newsletter.
            </p>
          </Section>

          <Section title="8. Children">
            <p>GRWTEE isn&apos;t meant for anyone under 13, and we don&apos;t knowingly collect their information.</p>
          </Section>

          <Section title="9. Changes">
            <p>
              If we change this policy we&apos;ll update this page and the date below, and tell you in the app or by email
              if the change is significant.
            </p>
          </Section>

          <p className="text-sm text-gray-dark/70">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>
    </div>
  );
}
