'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/admin/Toast'
import { Badge } from '@/components/admin/ui'
import { adminFetch } from '@/lib/adminFetch'
import type { OpenReport } from '@/lib/stylist-moderation'

type Action = 'restore' | 'remove' | 'dismiss'

const LAGOS = 'Africa/Lagos'
const when = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: LAGOS })

const TYPE_LABEL: Record<OpenReport['target_type'], string> = {
  comment: 'Comment',
  message: 'Message',
  look: 'Look',
  lookbook: 'Lookbook',
  tryon_result: 'Try-on image',
  user: 'Person'
}

const REASON_LABEL: Record<OpenReport['reason'], string> = {
  harassment: 'Harassment or hate',
  inappropriate: 'Inappropriate',
  spam: 'Spam',
  other: 'Something else'
}

// Content the stylist can hide, restore or delete from here.
const MODERATED = new Set<OpenReport['target_type']>(['comment', 'message', 'tryon_result'])

export function ReportsList({ initialReports }: { initialReports: OpenReport[] }) {
  const [reports, setReports] = useState(initialReports)
  const [busy, setBusy] = useState<string | null>(null)
  const toast = useToast()
  const { confirm, dialog } = useConfirm()

  async function review(report: OpenReport, action: Action) {
    if (
      action === 'remove' &&
      !(await confirm({
        title: `Delete this ${TYPE_LABEL[report.target_type].toLowerCase()}?`,
        body: 'It’s deleted for everyone. This can’t be undone.',
        confirmLabel: 'Delete',
        danger: true
      }))
    ) {
      return
    }

    setBusy(report.id)
    try {
      const res = await adminFetch('/api/stylist/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: report.id, action })
      })
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(data?.error)
      // Every open report about the same item is closed together.
      setReports((prev) => prev.filter((r) => !(r.target_type === report.target_type && r.target_id === report.target_id)))
      toast.success(action === 'restore' ? 'Restored.' : action === 'remove' ? 'Deleted.' : 'Dismissed.')
    } catch (e: unknown) {
      toast.error(e instanceof Error && e.message ? e.message : 'Couldn’t save that. Try again.')
    } finally {
      setBusy(null)
    }
  }

  if (!reports.length) {
    return <p className="rounded-2xl border border-atelier-border bg-white px-4 py-10 text-center text-sm text-atelier-muted">All reviewed.</p>
  }

  return (
    <>
      {dialog}
      <ul className="space-y-3">
        {reports.map((report) => {
          const moderated = MODERATED.has(report.target_type)
          const { text, image_url, title, name } = report.snapshot
          return (
            <li key={report.id} className="rounded-2xl border border-atelier-border bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="purple">{TYPE_LABEL[report.target_type]}</Badge>
                <Badge tone="red">{REASON_LABEL[report.reason]}</Badge>
                {report.content_hidden ? <Badge tone="gold">Hidden until you review it</Badge> : null}
                <span className="ml-auto text-xs tabular-nums text-atelier-faint">{when(report.created_at)}</span>
              </div>

              <div className="mt-3 flex gap-3">
                {image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image_url} alt="Reported image" className="h-24 w-24 shrink-0 rounded-xl object-cover" />
                ) : null}
                <div className="min-w-0 text-sm text-atelier-ink">
                  {text ? <p className="whitespace-pre-wrap break-words">{text}</p> : null}
                  {title ? <p className="font-medium">{title}</p> : null}
                  {name ? <p className="font-medium">{name}</p> : null}
                  {!text && !title && !name && !image_url ? <p className="text-atelier-muted">No preview.</p> : null}
                </div>
              </div>

              <p className="mt-3 text-xs text-atelier-muted">
                Reported by {report.reporter}
                {report.author ? ` · written by ${report.author}` : ''}
              </p>
              {report.details ? <p className="mt-1 text-xs text-atelier-muted">&ldquo;{report.details}&rdquo;</p> : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {moderated && report.content_hidden ? (
                  <Button size="sm" variant="outline" disabled={busy !== null} loading={busy === report.id} onClick={() => void review(report, 'restore')}>
                    Restore
                  </Button>
                ) : null}
                {moderated ? (
                  <Button size="sm" variant="danger" disabled={busy !== null} onClick={() => void review(report, 'remove')}>
                    Delete
                  </Button>
                ) : null}
                {!report.content_hidden ? (
                  <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void review(report, 'dismiss')}>
                    Dismiss
                  </Button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
