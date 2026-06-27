import Link from "next/link";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";

const websiteLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/mailing-list", label: "Mailing list" },
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/settings", label: "Settings" }
];

const stylistLinks = [
  { href: "/admin/looks", label: "Looks" },
  { href: "/admin/lookbooks", label: "Lookbooks" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/messages", label: "Messages" }
];

export function AdminSidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-gray-medium/60 bg-cream">
      <div className="px-4 py-4">
        <p className="font-accent text-xs font-semibold tracking-widest text-green-dark">
          ADMIN
        </p>
      </div>
      <nav className="px-2">
        {websiteLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="block rounded-md px-3 py-2 text-sm font-medium text-gray-dark hover:bg-cream-light"
          >
            {l.label}
          </Link>
        ))}
        <div className="mx-3 my-3 border-t border-gray-medium/40" />
        <p className="px-3 py-1 text-[10px] font-semibold tracking-widest uppercase text-gray-dark/50">
          Stylist
        </p>
        {stylistLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="block rounded-md px-3 py-2 text-sm font-medium text-gray-dark hover:bg-cream-light"
          >
            {l.label}
          </Link>
        ))}
        <AdminSignOutButton />
      </nav>
    </aside>
  );
}


