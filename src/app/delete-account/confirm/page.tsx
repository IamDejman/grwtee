import Link from "next/link";
import { ConfirmAccountDeletion } from "@/components/ConfirmAccountDeletion";

export const metadata = {
  title: "Confirm account deletion",
  // The address carries the link's token.
  robots: { index: false, follow: false }
};

export default async function ConfirmAccountDeletionPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="pattern-light">
      <div className="container-shell py-16">
        <h1 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
          Delete your GRWTEE account?
        </h1>
        <div className="mt-8 max-w-3xl text-[16px] leading-8 text-gray-dark/90">
          {token ? (
            <ConfirmAccountDeletion token={token} />
          ) : (
            <p>
              This link is missing its code. Open the link from the email again, or{" "}
              <Link href="/delete-account" className="font-semibold text-green-dark">
                ask for a new one
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
