import { NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * What the stylist dashboard may save for looks, lookbooks and calendars.
 * Anything else in a request is dropped, so a request can't set ids, owners,
 * counts or other columns the forms never send.
 *
 * There are no `.default()`s on purpose: zod applies them even inside
 * `.partial()`, so a quick change like publishing would reset other fields.
 * Left-out flags and lists get the database default on create instead.
 */

/** Optional text: trimmed, and empty becomes null. */
const text = (max: number) =>
  z.string().trim().max(max).nullish().transform((v) => v || null)

function isWebUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

const LINK_MESSAGE = 'Links need to be full web addresses, starting with https://.'

/** Optional web link, http or https only. Empty becomes null. */
const link = z
  .string()
  .trim()
  .max(2048)
  .nullish()
  .transform((v) => v || null)
  .refine((v) => v === null || isWebUrl(v), LINK_MESSAGE)

/** A link that must be there, such as a cover photo. */
const requiredLink = (message: string) =>
  z
    .string({ error: message })
    .trim()
    .min(1, message)
    .max(2048)
    .refine(isWebUrl, LINK_MESSAGE)

/**
 * A look item's price, a number column: "25,000", "₦25,000.50", "" or a
 * number. Symbols and thousands separators are dropped (parseFloat read
 * "25,000" as 25: ARCH-01). Empty becomes null.
 */
const price = z
  .union([z.string().trim().max(30), z.number()])
  .nullish()
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === '') return null
    const digits = typeof v === 'number' ? String(v) : v.replace(/[^\d.]/g, '')
    const n = /^\d+(\.\d+)?$/.test(digits) ? Number(digits) : NaN
    if (!Number.isFinite(n) || n < 0 || n >= 100_000_000) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid price.' })
      return z.NEVER
    }
    return Math.round(n * 100) / 100
  })

/**
 * A lookbook item's price, a text column the app fills with what people
 * type ("₦25,000"), so it's kept as written (ARCH-01). Empty becomes null.
 */
const priceText = z
  .union([z.string().trim().max(50), z.number()])
  .nullish()
  .transform((v) => (v === null || v === undefined || v === '' ? null : String(v)))

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.')
const optionalDate = isoDate.nullish().or(z.literal('')).transform((v) => v || null)
const optionalId = z.guid().nullish().or(z.literal('')).transform((v) => v || null)

const itemName = z.string({ error: 'Every item needs a name.' }).trim().min(1, 'Every item needs a name.').max(200)

const lookItem = z.object({
  category: z.string().trim().min(1).max(50),
  name: itemName,
  brand: text(200),
  color: text(100),
  image_url: link,
  purchase_url: link,
  price,
  currency: text(10),
  notes: text(1000)
})

const lookFields = z.object({
  title: z.string({ error: 'Give the look a title.' }).trim().min(1, 'Give the look a title.').max(200),
  description: text(5000),
  occasion: z.string({ error: 'Pick an occasion.' }).trim().min(1, 'Pick an occasion.').max(50),
  season: text(50),
  gender_target: text(50),
  body_shapes_suited: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  style_tags: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
  primary_image_url: requiredLink('Add a cover photo.'),
  is_premium: z.boolean().optional(),
  is_published: z.boolean().optional()
})

/** Create or edit a look. Leaving out `items` on an edit keeps the current items. */
export const lookSchema = lookFields.extend({
  items: z.array(lookItem).max(50).optional()
})

/** Quick changes from the looks grid, such as publishing. */
export const lookPatchSchema = lookFields.partial()

const LOOKBOOK_STATUSES = ['draft', 'requested', 'accepted', 'completed'] as const

const lookbookItem = z.object({
  // Set when the item was added from someone's wardrobe in the app; the
  // form sends it back unchanged.
  wardrobe_item_id: optionalId,
  name: itemName,
  brand: text(200),
  category: text(50),
  image_url: link,
  price: priceText,
  purchase_url: link,
  notes: text(1000)
})

/** Create or edit a lookbook. Leaving out `items` on an edit keeps the current items. */
export const lookbookSchema = z
  .object({
    title: z.string({ error: 'Give the lookbook a title.' }).trim().min(1, 'Give the lookbook a title.').max(200),
    type: z.string().trim().min(1).max(50).optional(),
    custom_type: text(100),
    description: text(5000),
    cover_image_url: link,
    event_date_start: optionalDate,
    event_date_end: optionalDate,
    status: z.enum(LOOKBOOK_STATUSES).optional(),
    assigned_to: optionalId,
    is_published: z.boolean().optional(),
    show_in_feed: z.boolean().optional(),
    items: z.array(lookbookItem).max(100).optional()
  })
  .refine((b) => !b.event_date_start || !b.event_date_end || b.event_date_end >= b.event_date_start, {
    message: 'The end date is before the start date.',
    path: ['event_date_end']
  })

export const calendarCreateSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024).max(2100),
  title: z.string().trim().min(1).max(200),
  is_published: z.boolean().optional()
})

export const calendarPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  is_published: z.boolean().optional()
})

/** One planned day. The calendar and date say which day; the rest is the plan. */
export const calendarDaySchema = z.object({
  date: isoDate,
  occasion: text(50),
  notes: text(2000),
  primary_look_id: optionalId,
  alternate_look_id: optionalId,
  lookbook_id: optionalId
})

export { isoDate }

/** The first problem with a request, worded for the dashboard to show. */
function firstIssue(error: z.ZodError): string {
  const message = error.issues[0]?.message
  // The messages written above are full sentences; zod's own aren't.
  return message?.endsWith('.') ? message : 'Some details aren’t valid. Check the form and try again.'
}

/** Reads and checks a JSON body, or gives the 400 response to send back. */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<{ data: z.output<T> } | { response: NextResponse }> {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (parsed.success) return { data: parsed.data }
  return { response: NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 }) }
}
