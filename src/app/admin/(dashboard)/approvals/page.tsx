import Link from 'next/link'
import { redirect } from 'next/navigation'
import { UserCheck } from 'lucide-react'
import { getStylistId } from '@/lib/stylist-auth'
import { getAccountsByApproval, type ApprovalStatus } from '@/lib/stylist-moderation'
import { EmptyState, PageHeader } from '@/components/admin/ui'
import { ApprovalsList } from '@/components/stylist/ApprovalsList'

export const metadata = { title: 'Sign-ups' }

const TABS: { value: ApprovalStatus; label: string }[] = [
  { value: 'pending', label: 'Waiting' },
  { value: 'declined', label: 'Declined' }
]

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const { status: requested } = await searchParams
  const status: ApprovalStatus = requested === 'declined' ? 'declined' : 'pending'
  const { accounts, error } = await getAccountsByApproval(status)

  return (
    <div>
      <PageHeader title="Sign-ups" />
      <p className="mb-4 max-w-2xl text-sm text-atelier-muted">
        New app accounts wait here until you approve them. They can&apos;t use the app until then, and get an email
        when you do.
      </p>

      <nav aria-label="Sign-ups" className="mb-4 flex gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === 'pending' ? '/admin/approvals' : '/admin/approvals?status=declined'}
            aria-current={tab.value === status ? 'page' : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm transition ${
              tab.value === status
                ? 'bg-atelier-ink text-white'
                : 'bg-white text-atelier-muted ring-1 ring-inset ring-atelier-border hover:text-atelier-ink'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          Couldn&apos;t load sign-ups. Refresh to try again.
        </p>
      ) : !accounts.length ? (
        <div className="rounded-2xl border border-atelier-border bg-white">
          <EmptyState
            icon={UserCheck}
            title={status === 'pending' ? 'No one is waiting for approval.' : 'You haven’t declined anyone.'}
          />
        </div>
      ) : (
        <ApprovalsList initialAccounts={accounts} status={status} />
      )}
    </div>
  )
}
