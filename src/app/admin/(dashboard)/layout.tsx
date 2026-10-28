import "@fontsource-variable/cormorant-garamond/wght.css";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ToastProvider } from "@/components/admin/Toast";
import { getAdminSession } from "@/lib/security/session-auth";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // The middleware only checks the cookie's signature. This also checks the
  // live session: signed out, revoked, or the password changed since.
  const session = await getAdminSession();
  if (!session) redirect("/admin/login?reason=session_expired");
  if (session.user.mustChangePassword) redirect("/admin/change-password");

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-atelier-canvas text-atelier-ink lg:flex-row">
        <AdminSidebar />
        {/* Bottom padding keeps content clear of the phone tab bar. */}
        <main className="min-w-0 flex-1 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-10 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
