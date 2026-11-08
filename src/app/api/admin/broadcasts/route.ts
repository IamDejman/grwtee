import {
  createBroadcast,
  findRecentDuplicate,
  remainingByBroadcast,
  sendBroadcast,
  toProgress
} from "@/lib/broadcasts";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/security/session-auth";

// Sending stops after SEND_BUDGET_MS and the page asks for the rest, so a
// request never runs into the platform's time limit.
export const maxDuration = 60;
const SEND_BUDGET_MS = 25_000;

const createSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  html: z.string().min(1).max(200_000)
});

export async function GET() {
  const session = await requireAdminSession();
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const broadcasts = await prisma.broadcast.findMany({
    orderBy: { createdAt: "desc" },
    take: 50
  });
  const remaining = await remainingByBroadcast(broadcasts.filter((b) => b.status === "sending").map((b) => b.id));
  return NextResponse.json({
    success: true,
    data: broadcasts.map((b) => toProgress(b, remaining.get(b.id) ?? 0))
  });
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid broadcast payload" },
      { status: 400 }
    );
  }

  const { subject, html } = parsed.data;
  const duplicate = await findRecentDuplicate(subject, html);
  if (duplicate) {
    return NextResponse.json(
      {
        success: false,
        error: "You already sent this broadcast in the last day. It’s on the mailing list page.",
        data: toProgress(duplicate, 0)
      },
      { status: 409 }
    );
  }

  const siteUrl =
    (await getConfig("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL)) ||
    new URL(req.url).origin;
  const broadcast = await createBroadcast({ subject, html, siteUrl });
  const progress = await sendBroadcast(broadcast.id, SEND_BUDGET_MS);

  return NextResponse.json({ success: true, data: progress });
}
