import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = 'force-dynamic';

async function getMetrics() {
  const [gallery, services, totalBookings] = await Promise.all([
    prisma.galleryImage.count(),
    prisma.service.count({ where: { active: true } }),
    prisma.bookingRequest.count()
  ]);
  return { gallery, services, totalBookings };
}

export default async function DashboardPage() {
  const m = await getMetrics();
  const cards = [
    {
      title: "Gallery images",
      value: m.gallery,
      href: "/admin/gallery"
    },
    {
      title: "Active services",
      value: m.services,
      href: "/admin/services"
    },
    {
      title: "Bookings, all time",
      value: m.totalBookings,
      href: "/admin/bookings"
    }
  ];
  return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="rounded-2xl border border-atelier-border bg-white p-4 transition hover:border-purple-dark/30"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-atelier-faint">{c.title}</p>
            <p className="mt-2 font-cormorant text-3xl font-medium tabular-nums text-atelier-ink">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
