import { getAuthOptions } from "@/lib/auth";
import { sendBroadcast } from "@/lib/broadcasts";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const maxDuration = 60;
const SEND_BUDGET_MS = 25_000;

/** POST: carry on sending a broadcast that's still going out. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const progress = await sendBroadcast(id, SEND_BUDGET_MS);
  if (!progress) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: progress });
}
