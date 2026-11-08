import { NewsletterActionPage } from "@/components/NewsletterActionPage";

type Props = { searchParams: Promise<{ token?: string }> };

export const metadata = {
  title: "Confirm your subscription",
  robots: { index: false }
};

export default async function ConfirmSubscriptionPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <NewsletterActionPage
      heading="One more step."
      body="Confirm that you'd like GRWTEE's newsletter at this address."
      action="/api/newsletter/confirm"
      token={token}
      button="Confirm my subscription"
    />
  );
}
