import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminSidebar />
      {/* Bottom padding keeps content clear of the phone tab bar. */}
      <main className="min-w-0 flex-1 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-6">
        {children}
      </main>
    </div>
  );
}
