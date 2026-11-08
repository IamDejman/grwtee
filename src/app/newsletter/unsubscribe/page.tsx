import { NewsletterActionPage } from "@/components/NewsletterActionPage";

type Props = { searchParams: Promise<{ token?: string }> };

export const metadata = {
  title: "Unsubscribe",
  robots: { index: false }
};

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <NewsletterActionPage
      heading="Leave the newsletter?"
      body="You'll stop getting GRWTEE's newsletter at this address. You can subscribe again anytime."
      action="/api/newsletter/unsubscribe"
      token={token}
      button="Unsubscribe"
    />
  );
}
