import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getServerSessionWithDB } from './auth-helpers'
import { createAdminClient } from './supabase/admin'
import { requireAdminFromRequest } from '@/lib/security/session-auth'
import { jsonUnauthorized, sanitizeClientError } from '@/lib/security/api-response'

/** Server Components — session via NextAuth + Supabase profile lookup. */
export async function getStylistId(): Promise<string | null> {
  const session = await getServerSessionWithDB()
  if (!session?.user?.email) return null
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', session.user.email)
    .single()
  return data?.id ?? null
}

/** API routes — JWT validated against live tokenVersion. */
export async function requireStylistId(request: NextRequest): Promise<string | null> {
  const admin = await requireAdminFromRequest(request)
  if (!admin) return null

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', admin.email)
    .single()

  return data?.id ?? null
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
