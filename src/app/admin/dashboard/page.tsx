import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

async function getMetrics() {
  const [gallery, services, pendingBookings, totalBookings] = await Promise.all([
    prisma.galleryImage.count(),
    prisma.service.count({ where: { active: true } }),
    prisma.bookingRequest.count({ where: { status: "pending" } }),
    prisma.bookingRequest.count()
  ]);
  return { gallery, services, pendingBookings, totalBookings };
}

export default async function DashboardPage() {
  const m = await getMetrics();
  const cards = [
    {
      title: "Total Gallery Images",
      value: m.gallery,
      href: "/admin/gallery"
    },
    {
      title: "Active Services",
      value: m.services,
      href: "/admin/services"
    },
    {
      title: "Pending Bookings",
      value: m.pendingBookings,
      href: "/admin/bookings"
    },
    {
      title: "Total Bookings (All Time)",
      value: m.totalBookings,
      href: "/admin/bookings"
    }
  ];
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-purple-dark">
        Dashboard
      </h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <a
            key={c.title}
            href={c.href}
            className="rounded-lg bg-white p-5 shadow-md ring-1 ring-gray-medium/60 transition hover:-translate-y-1 hover:shadow-xl"
          >
            <p className="text-sm text-gray-dark/80">{c.title}</p>
            <p className="mt-3 font-heading text-3xl font-semibold text-teal-dark">
              {c.value}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}


