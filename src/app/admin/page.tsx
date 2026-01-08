import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function AdminIndexPage() {
  redirect("/admin/login");
}


