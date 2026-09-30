import { Cormorant_Garamond } from "next/font/google";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { BodyClass } from "@/components/admin/BodyClass";
import { ToastProvider } from "@/components/admin/Toast";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap"
});

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <BodyClass className={cormorant.variable} />
      <div className={`${cormorant.variable} flex min-h-screen flex-col bg-atelier-canvas text-atelier-ink lg:flex-row`}>
        <AdminSidebar />
        {/* Bottom padding keeps content clear of the phone tab bar. */}
        <main className="min-w-0 flex-1 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-10 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
