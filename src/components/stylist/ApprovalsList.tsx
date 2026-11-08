'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/admin/Toast'
import { Badge } from '@/components/admin/ui'
import { adminFetch } from '@/lib/adminFetch'
import type { ApprovalStatus, PendingAccount } from '@/lib/stylist-moderation'

const LAGOS = 'Africa/Lagos'
const joined = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: LAGOS })

export function ApprovalsList({ initialAccounts, status }: { initialAccounts: PendingAccount[]; status: ApprovalStatus }) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [busy, setBusy] = useState<string | null>(null)
  const toast = useToast()
  const { confirm, dialog } = useConfirm()

  async function decide(account: PendingAccount, decision: 'approve' | 'decline') {
    const name = account.full_name?.trim() || account.email || 'this account'
    if (
      decision === 'decline' &&
      !(await confirm({
        title: `Decline ${name}?`,
        body: 'They won’t be able to use the app. You can approve them later from Declined.',
        confirmLabel: 'Decline',
        danger: true
      }))
    ) {
      return
    }

    setBusy(account.id)
    try {
      const res = await adminFetch('/api/stylist/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: account.id, decision })
      })
      const data = (await res.json().catch(() => null)) as { emailed?: boolean; error?: string } | null
      if (!res.ok) throw new Error(data?.error)
      setAccounts((prev) => prev.filter((a) => a.id !== account.id))
      if (decision === 'approve') {
        toast.success(data?.emailed ? `${name} is approved. We emailed them.` : `${name} is approved. The email didn’t send.`)
      } else {
        toast.success(`${name} is declined.`)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error && e.message ? e.message : 'Couldn’t save that. Try again.')
    } finally {
      setBusy(null)
    }
  }

  if (!accounts.length) {
    return <p className="rounded-2xl border border-atelier-border bg-white px-4 py-10 text-center text-sm text-atelier-muted">All done.</p>
  }

  return (
    <>
      {dialog}
      <ul className="divide-y divide-atelier-border overflow-hidden rounded-2xl border border-atelier-border bg-white">
        {accounts.map((account) => {
          const details = [account.country, account.contact_number, `Joined ${joined(account.created_at)}`].filter(Boolean)
          return (
            <li key={account.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-atelier-ink">
                  <span className="truncate">{account.full_name?.trim() || account.username || 'No name'}</span>
                  {account.email_verified ? <Badge tone="green">Email verified</Badge> : <Badge tone="gold">Email not verified</Badge>}
                </p>
                <p className="truncate text-sm text-atelier-muted">{account.email}</p>
                <p className="truncate text-xs text-atelier-faint">{details.join(' · ')}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" loading={busy === account.id} disabled={busy !== null} onClick={() => void decide(account, 'approve')}>
                  Approve
                </Button>
                {status === 'pending' ? (
                  <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void decide(account, 'decline')}>
                    Decline
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
