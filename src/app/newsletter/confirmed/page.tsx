import Link from "next/link";

type Props = {
  searchParams: Promise<{ already?: string; error?: string }>;
};

export const metadata = {
  title: "Subscription confirmed — GRWTEE",
  robots: { index: false }
};

export default async function ConfirmedPage({ searchParams }: Props) {
  const params = await searchParams;
  const already = params.already === "1";
  const error = params.error;

  let heading = "You're in.";
  let body =
    "Thanks for confirming. You'll hear from us when there's something worth opening.";
  if (already) {
    heading = "Already confirmed.";
    body = "Your subscription is active — no further action needed.";
  } else if (error) {
    heading = "This link is no longer valid.";
    body =
      "It may have already been used or expired. Try subscribing again from the footer.";
  }

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
