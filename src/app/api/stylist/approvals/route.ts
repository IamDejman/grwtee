import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStylist, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'
import { sendEmail } from '@/lib/resend'
import { accountApprovedHtml } from '@/lib/email-templates'
import { writeAuditLog, requestMeta } from '@/lib/security/audit-log'

const decisionSchema = z.object({
  id: z.guid(),
  decision: z.enum(['approve', 'decline'])
})

/**
 * PATCH /api/stylist/approvals — approve or decline a new app account.
 * Body: { id, decision }. Only client accounts are affected.
 */
export async function PATCH(request: NextRequest) {
  const stylist = await requireStylist(request)
  if (!stylist) return stylistUnauthorized()

  const parsed = decisionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { id, decision } = parsed.data

  const admin = createAdminClient()
  const { data: account, error } = await admin
    .from('profiles')
    .update({
      approval_status: decision === 'approve' ? 'approved' : 'declined',
      approval_decided_at: new Date().toISOString(),
      approval_decided_by: stylist.profileId
    })
    .eq('id', id)
    .eq('role', 'client')
    .select('id, email, full_name, approval_status')
    .maybeSingle()

  if (error) return stylistError(error.message, 500)
  if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Tell them they can sign in. A failed email doesn't undo the approval.
  let emailed = false
  if (decision === 'approve' && account.email) {
    const { error: sendError } = await sendEmail({
      to: account.email,
      subject: 'Your GRWTEE account is ready',
      html: accountApprovedHtml({ name: account.full_name }),
      text: 'Your stylist has approved your GRWTEE account. Open the app and sign in to get started.'
    })
    emailed = !sendError
  }

  const meta = requestMeta(request)
  await writeAuditLog({
    adminId: stylist.adminId,
    action: decision === 'approve' ? 'app.account.approve' : 'app.account.decline',
    resource: 'profiles',
    metadata: { profileId: id },
    ip: meta.ip,
    userAgent: meta.userAgent
  })

  return NextResponse.json({ account, emailed })
}
