import { randomUUID } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireStylist, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Dashboard photos for looks and lookbooks go to the app's Supabase
// storage, like the photos the app uploads (ARCH-05): one store with one
// set of rules, and the app accepts them when the stylist edits there.
const BUCKETS = { look: 'looks', lookbook: 'lookbooks' } as const
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const

const schema = z.object({
  kind: z.enum(['look', 'lookbook']),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp'])
})

/**
 * POST /api/stylist/uploads { kind, contentType }
 * A one-use address the browser uploads the photo to directly, so the file
 * never passes through Vercel and its 4.5 MB request limit (WEB-21), and
 * the address the photo will have once it's there.
 */
export async function POST(request: NextRequest) {
  const stylist = await requireStylist(request)
  if (!stylist) return stylistUnauthorized()

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return stylistError('Choose a JPG, PNG or WebP photo.', 400)

  const path = `${stylist.profileId}/${randomUUID()}.${EXTENSIONS[parsed.data.contentType]}`
  const storage = createAdminClient().storage.from(BUCKETS[parsed.data.kind])
  const { data, error } = await storage.createSignedUploadUrl(path)
  if (error || !data?.signedUrl) {
    console.error('[Stylist uploads] signed upload failed', { code: (error as { statusCode?: string } | null)?.statusCode })
    return stylistError("Couldn't start the upload. Try again.")
  }

  return NextResponse.json({
    data: { uploadUrl: data.signedUrl, publicUrl: storage.getPublicUrl(path).data.publicUrl }
  })
}
