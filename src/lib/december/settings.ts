import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_RULES, type SlotRules } from "./availability";

/**
 * Admin-editable December settings, stored in SiteSettings:
 * - december_rules: JSON (any subset of SlotRules), falls back to the Calendly defaults
 * - december_fee_ngn / december_fee_usd: whole-number amounts; both empty hides the fee
 * - december_capacity: max active bookings; empty means unlimited
 */

const KEYS = {
  rules: "december_rules",
  feeNgn: "december_fee_ngn",
  feeUsd: "december_fee_usd",
  capacity: "december_capacity"
} as const;

// Kept separate from the refinement so a saved partial setting can be read field by field.
const rulesFields = z.object({
  weekdays: z.array(z.number().int().min(0).max(6)).min(1),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
  slotMinutes: z.number().int().min(15).max(120),
  minNoticeMinutes: z.number().int().min(0).max(14 * 24 * 60),
  windowDays: z.number().int().min(1).max(180)
});

export const rulesSchema = rulesFields.refine((r) => r.endHour > r.startHour, {
  message: "End hour must be after start hour",
  path: ["endHour"]
});

export const settingsSchema = z.object({
  rules: rulesSchema,
  feeNgn: z.number().int().min(1).max(100_000_000).nullable(),
  feeUsd: z.number().int().min(1).max(1_000_000).nullable(),
  capacity: z.number().int().min(1).max(10_000).nullable()
});

export type DecemberSettings = z.infer<typeof settingsSchema>;

const amount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** The fee as shown to clients, e.g. "₦50,000 / $40"; empty when no fee is set. */
export function feeLabel({ feeNgn, feeUsd }: Pick<DecemberSettings, "feeNgn" | "feeUsd">): string {
  return [feeNgn && `₦${amount.format(feeNgn)}`, feeUsd && `$${amount.format(feeUsd)}`].filter(Boolean).join(" / ");
}

function positiveInt(raw: string | undefined): number | null {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function readAll(): Promise<Record<string, string>> {
  const rows = await prisma.siteSettings.findMany({ where: { key: { in: Object.values(KEYS) } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function parseRules(raw: string | undefined): SlotRules {
  if (!raw) return DEFAULT_RULES;
  try {
    const partial = rulesFields.partial().safeParse(JSON.parse(raw));
    if (partial.success) {
      const merged = { ...DEFAULT_RULES, ...partial.data };
      if (merged.endHour > merged.startHour) return merged;
    }
  } catch {
    // fall through
  }
  console.error("[December] Ignoring invalid december_rules setting");
  return DEFAULT_RULES;
}

export async function getSettings(): Promise<DecemberSettings> {
  try {
    const values = await readAll();
    return {
      rules: parseRules(values[KEYS.rules]),
      feeNgn: positiveInt(values[KEYS.feeNgn]),
      feeUsd: positiveInt(values[KEYS.feeUsd]),
      capacity: positiveInt(values[KEYS.capacity])
    };
  } catch (err) {
    console.error("[December] Could not read settings, using defaults", err);
    return { rules: DEFAULT_RULES, feeNgn: null, feeUsd: null, capacity: null };
  }
}

export async function getRules(): Promise<SlotRules> {
  return (await getSettings()).rules;
}

export async function saveSettings(settings: DecemberSettings): Promise<void> {
  const entries: [string, string][] = [
    [KEYS.rules, JSON.stringify(settings.rules)],
    [KEYS.feeNgn, settings.feeNgn === null ? "" : String(settings.feeNgn)],
    [KEYS.feeUsd, settings.feeUsd === null ? "" : String(settings.feeUsd)],
    [KEYS.capacity, settings.capacity === null ? "" : String(settings.capacity)]
  ];
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.siteSettings.upsert({ where: { key }, create: { key, value }, update: { value } })
    )
  );
}
