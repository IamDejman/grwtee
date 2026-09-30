import Link from "next/link";
import { ArrowUpRight, CalendarCheck, ChevronRight, Inbox, MessageSquare, Receipt, Sparkles, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getStylistId } from "@/lib/stylist-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeBookingCount, decemberEnabled } from "@/lib/december/booking";
import { getSettings } from "@/lib/december/settings";
import { formatSlot, whatsappLink } from "@/lib/december/format";
import { computeTotals, currencySymbol, parseItems } from "@/lib/invoice-totals";
import { formatServiceLabel } from "@/lib/utils";
import { Badge, EmptyState, Panel, Stat, type Tone } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const LAGOS = "Africa/Lagos";
// A call still shows as "next" until it is 30 minutes in, matching the December page.
const CALL_GRACE_MS = 30 * 60_000;

const enquiryStatus: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "gold" },
  contacted: { label: "Contacted", tone: "purple" },
  confirmed: { label: "Confirmed", tone: "green" },
  completed: { label: "Completed", tone: "neutral" }
};

/** One failing source shouldn't take the whole dashboard down. */
async function safe<T>(label: string, work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch (err) {
    console.error(`[Dashboard] ${label} failed`, err);
    return fallback;
  }
}

const wholeMoney = (amount: number, currency: string) => `${currencySymbol(currency)}${Math.round(amount).toLocaleString("en-US")}`;

const lagosDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: LAGOS }).format(d);

function greeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: LAGOS }).format(now));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

async function unreadMessages(): Promise<number> {
  const stylistId = await getStylistId();
  if (!stylistId) return 0;
  const admin = createAdminClient();
  const { data: convs, error } = await admin.from("conversations").select("id").eq("stylist_id", stylistId);
  if (error) throw error;
  if (!convs?.length) return 0;
  const { count, error: countError } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", convs.map((c) => c.id))
    .neq("sender_id", stylistId)
    .eq("is_read", false);
  if (countError) throw countError;
  return count ?? 0;
}

async function owed(now: Date) {
  const invoices = await prisma.invoice.findMany({ where: { status: "unpaid" }, select: { currency: true, items: true, dueDate: true } });
  const today = now.toISOString().slice(0, 10);
  const totals = { NGN: 0, USD: 0, overdue: 0 };
  for (const inv of invoices) {
    const total = computeTotals(parseItems(inv.items)).total;
    if (inv.currency === "USD") totals.USD += total;
    else totals.NGN += total;
    if (inv.dueDate.toISOString().slice(0, 10) < today) totals.overdue += 1;
  }
  return totals;
}

async function december(now: Date) {
  const since = new Date(now.getTime() - CALL_GRACE_MS);
  const [calls, awaitingPayment, booked, settings] = await Promise.all([
    prisma.decemberBooking.findMany({
      where: { status: { not: "cancelled" }, slotStart: { gte: since } },
      orderBy: { slotStart: "asc" },
      select: { id: true, name: true, status: true, slotStart: true, meetUrl: true, whatsapp: true },
      take: 5
    }),
    prisma.decemberBooking.count({ where: { status: "scheduled", slotStart: { gte: since } } }),
    activeBookingCount(),
    getSettings()
  ]);
  return { calls, awaitingPayment, booked, capacity: settings.capacity };
}

function AttentionRow({ href, icon: Icon, children, count }: { href: string; icon: LucideIcon; children: React.ReactNode; count: number }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-atelier-canvas sm:px-6"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[#8A6420]">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-sm text-atelier-ink">
          <span className="font-semibold tabular-nums">{count}</span> {children}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-atelier-faint" aria-hidden />
      </Link>
    </li>
  );
}

const pillLink =
  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-purple-dark transition hover:bg-atelier-lavender";

export default async function DashboardPage() {
  const now = new Date();
  const showDecember = decemberEnabled();

  const [dec, money, newEnquiries, enquiries, unread, subscribers] = await Promise.all([
    showDecember ? safe("December", () => december(now), null) : Promise.resolve(null),
    safe("Invoices", () => owed(now), null),
    safe("Enquiry count", () => prisma.bookingRequest.count({ where: { status: "pending" } }), 0),
    safe(
      "Enquiries",
      () =>
        prisma.bookingRequest.findMany({
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, service: true, status: true, createdAt: true },
          take: 5
        }),
      []
    ),
    safe("Messages", unreadMessages, 0),
    safe("Subscribers", () => prisma.subscriber.count({ where: { status: "confirmed" } }), null)
  ]);

  const today = lagosDay(now);
  const tomorrow = lagosDay(new Date(now.getTime() + 86_400_000));
  const dayLabel = (d: Date) => {
    const key = lagosDay(d);
    return key === today
      ? "Today"
      : key === tomorrow
        ? "Tomorrow"
        : new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: LAGOS }).format(d);
  };

  const attention = [
    { href: "/admin/bookings", icon: Inbox, count: newEnquiries, text: newEnquiries === 1 ? "new enquiry to reply to" : "new enquiries to reply to" },
    {
      href: "/admin/december",
      icon: Wallet,
      count: dec?.awaitingPayment ?? 0,
      text: dec?.awaitingPayment === 1 ? "December client hasn't paid yet" : "December clients haven't paid yet"
    },
    { href: "/admin/invoices", icon: Receipt, count: money?.overdue ?? 0, text: money?.overdue === 1 ? "invoice is overdue" : "invoices are overdue" },
    { href: "/admin/messages", icon: MessageSquare, count: unread, text: unread === 1 ? "unread message" : "unread messages" }
  ].filter((a) => a.count > 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-cormorant text-3xl font-medium leading-tight text-atelier-ink sm:text-4xl">{greeting(now)}</h1>
        <p className="mt-1 text-sm text-atelier-muted">
          {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: LAGOS }).format(now)}
        </p>
      </div>

      <Panel className="mb-6 !p-0 sm:!p-0">
        <h2 className="px-4 pt-4 font-cormorant text-2xl font-medium text-atelier-ink sm:px-6 sm:pt-5">Needs your attention</h2>
        {attention.length ? (
          <ul className="mt-2 divide-y divide-atelier-border/70 pb-1">
            {attention.map((a) => (
              <AttentionRow key={a.href} href={a.href} icon={a.icon} count={a.count}>
                {a.text}
              </AttentionRow>
            ))}
          </ul>
        ) : (
          <p className="px-4 pb-5 pt-2 text-sm text-atelier-muted sm:px-6">You&apos;re all caught up.</p>
        )}
      </Panel>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Owed in naira" value={money ? wholeMoney(money.NGN, "NGN") : "-"} />
        <Stat label="Owed in dollars" value={money ? wholeMoney(money.USD, "USD") : "-"} />
        {showDecember ? (
          <Stat label="December booked" value={dec ? (dec.capacity === null ? dec.booked : `${dec.booked} / ${dec.capacity}`) : "-"} />
        ) : null}
        <Stat label="Subscribers" value={subscribers ?? "-"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {showDecember ? (
          <Panel
            title="Next calls"
            className="lg:col-span-3"
            actions={
              <Link href="/admin/december" className={pillLink}>
                View all
              </Link>
            }
          >
            {!dec ? (
              <p className="text-sm text-atelier-muted">Couldn&apos;t load December calls. Refresh to try again.</p>
            ) : !dec.calls.length ? (
              <EmptyState icon={CalendarCheck} title="No calls booked yet." />
            ) : (
              <ul className="-mx-4 divide-y divide-atelier-border/70 sm:-mx-6">
                {dec.calls.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-6">
                    <div className="w-24 shrink-0">
                      <p className="text-sm font-medium text-atelier-ink">{dayLabel(c.slotStart)}</p>
                      <p className="text-sm tabular-nums text-atelier-muted">{formatSlot(c.slotStart, LAGOS).time}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-atelier-ink">{c.name}</p>
                      <Badge tone={c.status === "paid" ? "green" : "gold"}>{c.status === "paid" ? "Paid" : "Awaiting payment"}</Badge>
                    </div>
                    <div className="-mr-2.5 flex items-center gap-1">
                      {c.meetUrl ? (
                        <a href={c.meetUrl} target="_blank" rel="noopener noreferrer" className={pillLink}>
                          Join
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      ) : null}
                      <a href={whatsappLink(c.whatsapp)} target="_blank" rel="noopener noreferrer" className={pillLink}>
                        WhatsApp
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}

        <Panel
          title="Latest enquiries"
          className={showDecember ? "lg:col-span-2" : "lg:col-span-5"}
          actions={
            <Link href="/admin/bookings" className={pillLink}>
              View all
            </Link>
          }
        >
          {!enquiries.length ? (
            <EmptyState icon={Sparkles} title="No enquiries yet." />
          ) : (
            <ul className="-mx-4 divide-y divide-atelier-border/70 sm:-mx-6">
              {enquiries.map((e) => {
                const status = enquiryStatus[e.status] ?? { label: e.status, tone: "neutral" as Tone };
                return (
                  <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-6">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-atelier-ink">{e.name}</p>
                      <p className="truncate text-sm text-atelier-muted">
                        {formatServiceLabel(e.service)} · {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: LAGOS }).format(e.createdAt)}
                      </p>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
