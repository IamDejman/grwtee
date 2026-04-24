import Link from "next/link";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export const metadata = {
  title: "Unsubscribed — GRWTEE",
  robots: { index: false }
};

export default async function UnsubscribedPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = params.error;

  const heading = error ? "Link not valid." : "You've been unsubscribed.";
  const body = error
    ? "The link is missing or no longer valid. If you keep getting emails, contact book@grwtee.com."
    : "Sorry to see you go. You can subscribe again anytime from the footer.";

  return (
    <div className="pattern-light">
      <div className="container-shell py-20 text-center">
        <p className="font-accent text-xs font-semibold tracking-[0.25em] text-green-dark">
          NEWSLETTER
        </p>
        <h1 className="mt-4 font-heading text-3xl font-semibold text-purple-dark">
          {heading}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-dark/80">{body}</p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="rounded-full bg-green-dark px-8 py-3 font-accent font-semibold text-white transition hover:bg-purple-medium"
          >
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
