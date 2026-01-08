import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export async function AdminHeader() {
  const session = await getServerSession(await getAuthOptions());
  return (
    <header className="flex items-center justify-between border-b border-gray-medium/60 bg-white px-6 py-4">
      <h1 className="font-heading text-xl font-semibold text-purple-dark">
        Admin
      </h1>
      <div className="text-sm text-gray-dark/80">
        {session?.user?.email || "admin"}
      </div>
    </header>
  );
}


