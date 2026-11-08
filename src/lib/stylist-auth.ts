import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from './supabase/admin'
import { prisma } from '@/lib/prisma'
import { requireAdminFromRequest, requireAdminSession } from '@/lib/security/session-auth'
import { jsonUnauthorized, sanitizeClientError } from '@/lib/security/api-response'

const STAFF_ROLES = ['stylist', 'admin']

/**
 * The stylist's profile in the app, for a dashboard admin. Linked once by
 * email and stored on the admin (Admin.supabaseProfileId); after that it's
 * looked up by id, so changing the email on either side no longer cuts the
 * dashboard off (ARCH-02). Only a stylist or admin profile counts.
 */
export async function stylistProfileId(admin: { id: string; email: string }): Promise<string | null> {
  const supabase = createAdminClient()
  const row = await prisma.admin.findUnique({ where: { id: admin.id }, select: { supabaseProfileId: true } })

  if (row?.supabaseProfileId) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', row.supabaseProfileId)
      .in('role', STAFF_ROLES)
      .maybeSingle()
    return data?.id ?? null
  }

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', admin.email)
    .in('role', STAFF_ROLES)
    .maybeSingle()
  if (!data?.id) return null
  await prisma.admin
    .update({ where: { id: admin.id }, data: { supabaseProfileId: data.id } })
    .catch((err) => console.error('[Stylist] Could not save the linked profile', { code: (err as { code?: string }).code }))
  return data.id
}

/** Server Components: the signed-in admin's app profile id. */
export async function getStylistId(): Promise<string | null> {
  const session = await requireAdminSession()
  if (!session?.user?.email || !session.user.id) return null
  return stylistProfileId({ id: session.user.id, email: session.user.email })
}

/** API routes — JWT validated against live tokenVersion. */
export async function requireStylistId(request: NextRequest): Promise<string | null> {
  return (await requireStylist(request))?.profileId ?? null
}

/** Like requireStylistId, plus the admin id the audit log records. */
export async function requireStylist(
  request: NextRequest
): Promise<{ adminId: string; profileId: string } | null> {
  const admin = await requireAdminFromRequest(request)
  if (!admin) return null

  const profileId = await stylistProfileId(admin)
  return profileId ? { adminId: admin.id, profileId } : null
}

export function stylistError(message?: string, status = 500) {
  return NextResponse.json(
    { error: sanitizeClientError(message, 'Request failed') },
    { status }
  )
}

export function stylistUnauthorized() {
  return jsonUnauthorized()
}
