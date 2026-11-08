import { redirect } from 'next/navigation'
import { Flag } from 'lucide-react'
import { getStylistId } from '@/lib/stylist-auth'
import { getOpenReports } from '@/lib/stylist-moderation'
import { EmptyState, PageHeader } from '@/components/admin/ui'
import { ReportsList } from '@/components/stylist/ReportsList'

export const metadata = { title: 'Reports' }

export default async function ReportsPage() {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const { reports, error } = await getOpenReports()

  return (
    <div>
      <PageHeader title="Reports" />
      <p className="mb-4 max-w-2xl text-sm text-atelier-muted">
        What people have reported in the app. Reported comments and messages from clients are hidden from everyone
        but you until you restore or remove them. Reports about your own looks and lookbooks don&apos;t hide anything.
      </p>

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          Couldn&apos;t load reports. Refresh to try again.
        </p>
      ) : !reports.length ? (
        <div className="rounded-2xl border border-atelier-border bg-white">
          <EmptyState icon={Flag} title="Nothing to review." />
        </div>
      ) : (
        <ReportsList initialReports={reports} />
      )}
    </div>
  )
}
