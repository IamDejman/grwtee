"use client";

import { Dialog, Transition } from "@headlessui/react";
import {
  BookOpen,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  Ellipsis,
  Images,
  LayoutDashboard,
  ListChecks,
  Mail,
  MessageSquare,
  Receipt,
  Settings,
  Shirt,
  Sparkles,
  Users,
  X,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useState } from "react";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";

type NavLink = { href: string; label: string; icon: LucideIcon };

const websiteLinks: NavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/gallery", label: "Gallery", icon: Images },
  { href: "/admin/services", label: "Services", icon: Briefcase },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/december", label: "December", icon: Sparkles },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt },
  { href: "/admin/mailing-list", label: "Mailing list", icon: Mail },
  { href: "/admin/waitlist", label: "Waitlist", icon: ListChecks },
  { href: "/admin/settings", label: "Settings", icon: Settings }
];

const stylistLinks: NavLink[] = [
  { href: "/admin/looks", label: "Looks", icon: Shirt },
  { href: "/admin/lookbooks", label: "Lookbooks", icon: BookOpen },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare }
];

// The phone bottom bar: the most-used sections, with everything else under "More".
const tabHrefs = ["/admin/dashboard", "/admin/bookings", "/admin/december", "/admin/invoices"];
const tabLabels: Record<string, string> = { "/admin/dashboard": "Home" };

const allLinks = [...websiteLinks, ...stylistLinks];
const tabs = tabHrefs.map((href) => allLinks.find((l) => l.href === href)!);

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLinks({ pathname }: { pathname: string }) {
  const renderLink = (l: NavLink) => {
    const active = isActive(pathname, l.href);
    const Icon = l.icon;
    return (
      <Link
        key={l.href}
        href={l.href}
        aria-current={active ? "page" : undefined}
        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          active ? "bg-atelier-active text-white" : "text-atelier-nav-text hover:bg-white/5 hover:text-white"
        }`}
      >
        {active ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold" aria-hidden="true" /> : null}
        <Icon
          className={`h-4 w-4 shrink-0 ${active ? "text-gold" : "text-atelier-faint group-hover:text-white"}`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        {l.label}
      </Link>
    );
  };
  return (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-0.5 px-3 pb-4">
      <p className="px-3 pb-2 text-[10px] font-medium tracking-[0.2em] uppercase text-atelier-faint/70">Website</p>
      {websiteLinks.map(renderLink)}
      <p className="px-3 pb-2 pt-6 text-[10px] font-medium tracking-[0.2em] uppercase text-atelier-faint/70">Stylist</p>
      {stylistLinks.map(renderLink)}
      <div className="mt-auto border-t border-white/10 pt-3">
        <AdminSignOutButton />
      </div>
    </nav>
  );
}

function SheetGrid({
  title,
  links,
  pathname,
  onNavigate
}: {
  title: string;
  links: NavLink[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div>
      <p className="px-1 text-[10px] font-medium tracking-[0.2em] uppercase text-atelier-faint">
        {title}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {links.map((l) => {
          const active = isActive(pathname, l.href);
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-xl px-1 text-center text-xs font-medium ${
                active
                  ? "bg-purple-dark text-white"
                  : "bg-white text-atelier-ink ring-1 ring-atelier-border active:bg-atelier-lavender"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {l.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname() ?? "";
  const [moreOpen, setMoreOpen] = useState(false);
  const current = allLinks.find((l) => isActive(pathname, l.href));
  const onTab = tabs.some((t) => isActive(pathname, t.href));

  return (
    <>
      {/* Phones and tablets: page name up top, section tabs along the bottom. */}
      <header className="sticky top-0 z-30 flex h-12 items-center gap-3 bg-atelier-surface px-4 lg:hidden">
        <Image src="/logo.svg" alt="GRWTEE" width={72} height={14} className="brightness-0 invert" style={{ width: 72, height: "auto" }} />
        {current ? (
          <span className="truncate border-l border-white/15 pl-3 text-sm text-atelier-nav-text">{current.label}</span>
        ) : null}
      </header>

      <nav
        aria-label="Admin sections"
        className="fixed inset-x-0 bottom-0 z-40 touch-manipulation border-t border-atelier-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {tabs.map((t) => {
            const active = isActive(pathname, t.href);
            const Icon = t.icon;
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                    active ? "text-purple-dark" : "text-atelier-faint"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                  {tabLabels[t.href] ?? t.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              className={`flex h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                !onTab && current ? "text-purple-dark" : "text-atelier-faint"
              }`}
            >
              <Ellipsis className="h-5 w-5" aria-hidden="true" />
              More
            </button>
          </li>
        </ul>
      </nav>

      <Transition show={moreOpen} as={Fragment}>
        <Dialog onClose={setMoreOpen} className="relative z-50 lg:hidden">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-dark/40" aria-hidden="true" />
          </Transition.Child>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="translate-y-full"
            enterTo="translate-y-0"
            leave="ease-in duration-150"
            leaveFrom="translate-y-0"
            leaveTo="translate-y-full"
          >
            <Dialog.Panel className="fixed inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-2xl bg-atelier-canvas px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl">
              <div className="mx-auto h-1 w-10 rounded-full bg-gray-medium" aria-hidden="true" />
              <div className="mt-2 flex items-center justify-between">
                <Dialog.Title className="font-cormorant text-2xl font-medium text-atelier-ink">
                  All sections
                </Dialog.Title>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label="Close"
                  className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-dark hover:bg-cream-light"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-3 space-y-5">
                <SheetGrid
                  title="Website"
                  links={websiteLinks}
                  pathname={pathname}
                  onNavigate={() => setMoreOpen(false)}
                />
                <SheetGrid
                  title="Stylist"
                  links={stylistLinks}
                  pathname={pathname}
                  onNavigate={() => setMoreOpen(false)}
                />
                <AdminSignOutButton tone="light" />
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </Dialog>
      </Transition>

      {/* Desktop: the sidebar stays in view while the page scrolls. */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-atelier-surface lg:flex [&_*:focus-visible]:outline-gold">
        <Link href="/admin/dashboard" className="flex items-baseline gap-2 px-6 pb-8 pt-7">
          <Image src="/logo.svg" alt="GRWTEE" width={96} height={18} className="brightness-0 invert" style={{ width: 96, height: "auto" }} />
          <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-gold">Admin</span>
        </Link>
        <SidebarLinks pathname={pathname} />
      </aside>
    </>
  );
}
