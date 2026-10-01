import { NextResponse } from "next/server";
import { expireHolds } from "@/lib/december/booking";
import { cronAuthorised } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Hourly: releases unpaid holds past their 24 hours and sends the "hold lapsed" emails.
 * Vercel Hobby only allows daily crons, so this is scheduled in Supabase (pg_cron + pg_net,
 * job "december-holds-hourly"), which sends `Authorization: Bearer $CRON_SECRET` from Vault.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const expiredHolds = await expireHolds();
  return NextResponse.json({ success: true, expiredHolds });
}
