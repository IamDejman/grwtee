import { createAdminClient } from '@/lib/supabase/admin'

export type ApprovalStatus = 'pending' | 'declined'

export type PendingAccount = {
  id: string
  full_name: string | null
  username: string | null
  email: string | null
  country: string | null
  contact_number: string | null
  created_at: string
  approval_status: ApprovalStatus
  email_verified: boolean
}

const PAGE = 100

/** App accounts waiting for approval (or declined), newest first. */
export async function getAccountsByApproval(
  status: ApprovalStatus
): Promise<{ accounts: PendingAccount[]; error: boolean }> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, username, email, country, contact_number, created_at, approval_status')
    .eq('approval_status', status)
    .eq('role', 'client')
    .order('created_at', { ascending: false })
    .limit(PAGE)
  if (error) return { accounts: [], error: true }

  // Whether each has confirmed their email; that lives with the auth user.
  const accounts = await Promise.all(
    (data ?? []).map(async (p) => {
      const { data: auth } = await admin.auth.admin.getUserById(p.id)
      return { ...p, email_verified: Boolean(auth?.user?.email_confirmed_at) } as PendingAccount
    })
  )
  return { accounts, error: false }
}

export type OpenReport = {
  id: string
  target_type: 'comment' | 'message' | 'look' | 'lookbook' | 'tryon_result' | 'user'
  target_id: string
  reason: 'spam' | 'harassment' | 'inappropriate' | 'other'
  details: string | null
  snapshot: { text?: string | null; image_url?: string | null; title?: string | null; name?: string | null }
  content_hidden: boolean
  created_at: string
  reporter: string
  author: string | null
}

/** Reports nobody has reviewed yet, newest first, with who sent and who wrote each. */
export async function getOpenReports(): Promise<{ reports: OpenReport[]; error: boolean }> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('content_reports')
    .select('id, reporter_id, target_type, target_id, target_user_id, reason, details, snapshot, content_hidden, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(PAGE)
  if (error) return { reports: [], error: true }

  const ids = [...new Set((data ?? []).flatMap((r) => [r.reporter_id, r.target_user_id]).filter(Boolean))] as string[]
  const names = new Map<string, string>()
  if (ids.length) {
    const { data: people } = await admin.from('profiles').select('id, full_name, username, email').in('id', ids)
    for (const p of people ?? []) names.set(p.id, p.full_name?.trim() || p.username || p.email || 'Unnamed')
  }

  const reports = (data ?? []).map((r) => ({
    id: r.id,
    target_type: r.target_type,
    target_id: r.target_id,
    reason: r.reason,
    details: r.details,
    snapshot: (r.snapshot ?? {}) as OpenReport['snapshot'],
    content_hidden: r.content_hidden,
    created_at: r.created_at,
    reporter: (r.reporter_id && names.get(r.reporter_id)) || 'A deleted account',
    author: r.target_user_id ? names.get(r.target_user_id) ?? null : null
  })) as OpenReport[]
  return { reports, error: false }
}

/** How many sign-ups and reports are waiting, for the sidebar and dashboard. */
export async function getModerationCounts(): Promise<{ signups: number; reports: number }> {
  const admin = createAdminClient()
  const [signups, reports] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending').eq('role', 'client'),
    admin.from('content_reports').select('id', { count: 'exact', head: true }).eq('status', 'open')
  ])
  return { signups: signups.count ?? 0, reports: reports.count ?? 0 }
}
