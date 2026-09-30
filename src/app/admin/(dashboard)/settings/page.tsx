import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { BusinessSettings } from "@/components/admin/settings/BusinessSettings";
import { AccountSettings } from "@/components/admin/settings/AccountSettings";
import { PaymentAccountsManager } from "@/components/admin/PaymentAccountsManager";
import { EnvSettingsPanel } from "@/components/admin/EnvSettingsPanel";

export const metadata = { title: "Settings" };

const TABS = [
  { id: "business", label: "Business" },
  { id: "payments", label: "Payments" },
  { id: "account", label: "Account & sign-in" },
  { id: "advanced", label: "Advanced" }
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active: TabId = TABS.find((t) => t.id === tab)?.id ?? "business";

  return (
    <div>
      <PageHeader title="Settings" />
      <nav aria-label="Settings sections" className="-mx-4 mb-6 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <ul className="flex w-max gap-1 border-b border-atelier-border sm:w-auto">
          {TABS.map((t) => (
            <li key={t.id}>
              <Link
                href={t.id === "business" ? "/admin/settings" : `/admin/settings?tab=${t.id}`}
                aria-current={t.id === active ? "page" : undefined}
                className={`-mb-px block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  t.id === active
                    ? "border-purple-dark text-atelier-ink"
                    : "border-transparent text-atelier-muted hover:text-atelier-ink"
                }`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {active === "business" ? <BusinessSettings /> : null}
      {active === "payments" ? <PaymentAccountsManager /> : null}
      {active === "account" ? <AccountSettings /> : null}
      {active === "advanced" ? <EnvSettingsPanel /> : null}
    </div>
  );
}
