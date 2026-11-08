import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStylist, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'
import { writeAuditLog, requestMeta } from '@/lib/security/audit-log'

const actionSchema = z.object({
  id: z.guid(),
  action: z.enum(['restore', 'remove', 'dismiss'])
})

// Where each kind of reported content lives, for the kinds the stylist can
// hide, restore or delete. Looks, lookbooks and people are only dismissed:
// the stylist edits their own content in the dashboard.
const CONTENT_TABLES = {
  comment: 'comments',
  message: 'messages',
  tryon_result: 'tryon_jobs'
} as const

type ModeratedType = keyof typeof CONTENT_TABLES

function isModerated(type: string): type is ModeratedType {
  return type in CONTENT_TABLES
}

/**
 * PATCH /api/stylist/reports — review a report. Body: { id, action }
 * - restore: show the hidden content again
 * - remove: delete the content
 * - dismiss: no action (not for hidden content: restore or remove it)
 * Every open report about the same item is closed together.
 */
export async function PATCH(request: NextRequest) {
  const stylist = await requireStylist(request)
  if (!stylist) return stylistUnauthorized()

  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { id, action } = parsed.data

  const admin = createAdminClient()
  const { data: report, error: reportError } = await admin
    .from('content_reports')
    .select('id, target_type, target_id, status, content_hidden')
    .eq('id', id)
    .maybeSingle()

  if (reportError) return stylistError(reportError.message, 500)
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (report.status !== 'open') {
    return NextResponse.json({ error: 'This report has already been reviewed.' }, { status: 409 })
  }

  const moderated = isModerated(report.target_type)
  if ((action === 'restore' || action === 'remove') && !moderated) {
    return NextResponse.json({ error: 'This kind of report can only be dismissed.' }, { status: 400 })
  }
  if (action === 'dismiss' && report.content_hidden) {
    return NextResponse.json({ error: 'Restore or remove hidden content.' }, { status: 400 })
  }

  if (moderated) {
    const table = CONTENT_TABLES[report.target_type as ModeratedType]
    if (action === 'restore') {
      const { error } = await admin.from(table).update({ hidden_at: null }).eq('id', report.target_id)
      if (error) return stylistError(error.message, 500)
    } else if (action === 'remove') {
      if (report.target_type === 'tryon_result') {
        // The generated images are stored apart from the job row.
        const { data: job } = await admin.from('tryon_jobs').select('user_id').eq('id', report.target_id).maybeSingle()
        if (job) {
          const folder = `tryon-results/${job.user_id}/${report.target_id}`
          await admin.storage.from('user-assets').remove([`${folder}-final.jpg`, `${folder}-intermediate.jpg`])
        }
      }
      const { error } = await admin.from(table).delete().eq('id', report.target_id)
      if (error) return stylistError(error.message, 500)
    }
  }

  const status = action === 'restore' ? 'restored' : action === 'remove' ? 'removed' : 'dismissed'
  const { error: closeError } = await admin
    .from('content_reports')
    .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: stylist.profileId })
    .eq('target_type', report.target_type)
    .eq('target_id', report.target_id)
    .eq('status', 'open')

  if (closeError) return stylistError(closeError.message, 500)

  const meta = requestMeta(request)
  await writeAuditLog({
    adminId: stylist.adminId,
    action: `app.report.${action}`,
    resource: 'content_reports',
    metadata: { reportId: id, targetType: report.target_type },
    ip: meta.ip,
    userAgent: meta.userAgent
  })

  return NextResponse.json({ status })
}
