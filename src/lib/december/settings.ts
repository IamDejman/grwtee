import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_RULES, type SlotRules } from "./availability";

/**
 * Admin-editable December settings, stored in SiteSettings:
 * - december_rules: JSON (any subset of SlotRules), falls back to the Calendly defaults
 * - december_fee: free text shown to clients, e.g. "₦50,000 / $40"; empty hides the fee
 * - december_capacity: max active bookings; empty means unlimited
 */

const KEYS = { rules: "december_rules", fee: "december_fee", capacity: "december_capacity" } as const;

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
  fee: z.string().trim().max(120),
  capacity: z.number().int().min(1).max(10_000).nullable()
});

export type DecemberSettings = z.infer<typeof settingsSchema>;

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
    const capacity = Number.parseInt(values[KEYS.capacity] ?? "", 10);
    return {
      rules: parseRules(values[KEYS.rules]),
      fee: values[KEYS.fee] ?? "",
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null
    };
  } catch (err) {
    console.error("[December] Could not read settings, using defaults", err);
    return { rules: DEFAULT_RULES, fee: "", capacity: null };
  }
}

export async function getRules(): Promise<SlotRules> {
  return (await getSettings()).rules;
}

export async function saveSettings(settings: DecemberSettings): Promise<void> {
  const entries: [string, string][] = [
    [KEYS.rules, JSON.stringify(settings.rules)],
    [KEYS.fee, settings.fee],
    [KEYS.capacity, settings.capacity === null ? "" : String(settings.capacity)]
  ];
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.siteSettings.upsert({ where: { key }, create: { key, value }, update: { value } })
    )
  );
}
