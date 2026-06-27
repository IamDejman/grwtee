import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStylistId } from '@/lib/stylist-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { Plus, BookOpen, Calendar } from 'lucide-react'

export const metadata = { title: 'Lookbooks' }

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#F2EDF8', text: '#9A8DAA' },
  requested: { bg: '#FEF9E7', text: '#CF9D4E' },
  accepted: { bg: '#EBF5FB', text: '#5DADE2' },
  completed: { bg: '#E9F7EF', text: '#0D674E' }
}

export default async function LookbooksPage() {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: lookbooks } = await admin
    .from('lookbooks')
    .select('id, title, type, cover_image_url, status, event_date_start, event_date_end, assigned_to, is_published')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  const groups: Record<string, typeof lookbooks> = { requested: [], accepted: [], draft: [], completed: [] }
  ;(lookbooks ?? []).forEach((lb) => {
    const key = lb.status ?? 'draft'
    if (!groups[key]) groups[key] = []
    groups[key]!.push(lb)
  })

  return (
    <div className="min-h-full" style={{ backgroundColor: '#F8F5EE' }}>
      <div
        className="sticky top-0 z-10 px-6 lg:px-8 py-5 flex items-center justify-between"
        style={{ backgroundColor: 'rgba(248,245,238,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #EAE4D8' }}
      >
        <div>
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#9A8DAA' }}>Content</p>
          <h1 className="text-2xl lg:text-3xl font-light leading-tight mt-0.5" style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}>Lookbooks</h1>
        </div>
        <Link href="/admin/lookbooks/new" className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium" style={{ backgroundColor: '#422D64', color: '#FFFFFF' }}>
          <Plus className="w-4 h-4" /> New Lookbook
        </Link>
      </div>

      <div className="px-6 lg:px-8 py-6 space-y-8">
        {(groups.requested?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#CF9D4E' }} />
              <h2 className="text-lg font-light" style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}>Pending Requests</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#FEF9E7', color: '#CF9D4E' }}>{groups.requested!.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.requested!.map((lb) => <LookbookCard key={lb.id} lookbook={lb} />)}
            </div>
          </section>
        )}
        {(groups.accepted?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-lg font-light mb-4" style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}>In Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.accepted!.map((lb) => <LookbookCard key={lb.id} lookbook={lb} />)}
            </div>
          </section>
        )}
        {(groups.draft?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-lg font-light mb-4" style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}>Drafts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.draft!.map((lb) => <LookbookCard key={lb.id} lookbook={lb} />)}
            </div>
          </section>
        )}
        {(groups.completed?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-lg font-light mb-4" style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}>Completed</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.completed!.map((lb) => <LookbookCard key={lb.id} lookbook={lb} />)}
            </div>
          </section>
        )}
        {(lookbooks ?? []).length === 0 && (
          <div className="rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px dashed #D4C9BB' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F2EDF8' }}>
              <BookOpen className="w-5 h-5" style={{ color: '#B0A0C4' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: '#5A4D6A' }}>No lookbooks yet</p>
            <Link href="/admin/lookbooks/new" className="mt-2 px-4 py-2 rounded-xl text-xs font-medium" style={{ backgroundColor: '#422D64', color: '#FFFFFF' }}>Create Lookbook</Link>
          </div>
        )}
      </div>
    </div>
  )
}

function LookbookCard({ lookbook }: { lookbook: { id: string; title: string; type: string; cover_image_url: string | null; status: string; event_date_start: string | null; event_date_end: string | null; assigned_to: string | null; is_published: boolean } }) {
  const statusStyle = STATUS_COLORS[lookbook.status] ?? STATUS_COLORS.draft
  const typeLabel = lookbook.type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  return (
    <Link href={`/admin/lookbooks/${lookbook.id}`} className="group rounded-2xl overflow-hidden transition-all" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="aspect-video relative overflow-hidden" style={{ backgroundColor: '#F2EDF8' }}>
        {lookbook.cover_image_url ? (
          <img src={lookbook.cover_image_url} alt={lookbook.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-8 h-8" style={{ color: '#D4C9BB' }} /></div>
        )}
        <div className="absolute top-3 left-3">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>{lookbook.status}</span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm font-medium truncate mb-1" style={{ color: '#1A1428' }}>{lookbook.title}</p>
        <p className="text-xs capitalize" style={{ color: '#9A8DAA' }}>{typeLabel}</p>
        {lookbook.event_date_start && (
          <div className="flex items-center gap-1.5 mt-2">
            <Calendar className="w-3 h-3" style={{ color: '#B0A0C4' }} />
            <span className="text-xs" style={{ color: '#9A8DAA' }}>
              {new Date(lookbook.event_date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {lookbook.event_date_end && lookbook.event_date_end !== lookbook.event_date_start && ` – ${new Date(lookbook.event_date_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
