import Link from "next/link";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/settings", label: "Settings" }
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
        {links.map((l) => (
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


