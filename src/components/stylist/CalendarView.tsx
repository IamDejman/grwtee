'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/admin/Modal'
import { useToast } from '@/components/admin/Toast'
import { Badge, PageHeader, SearchInput } from '@/components/admin/ui'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Values match what the calendar days table accepts. Colours only mark the day; the name is always shown too.
const OCCASIONS = [
  { value: 'casual', label: 'Casual', color: '#7DB88F' },
  { value: 'corporate', label: 'Corporate', color: '#6A9CC9' },
  { value: 'work', label: 'Work', color: '#6A9CC9' },
  { value: 'date_night', label: 'Date night', color: '#B98BC9' },
  { value: 'formal', label: 'Formal', color: '#D9A066' },
  { value: 'streetwear', label: 'Streetwear', color: '#D98080' },
  { value: 'athleisure', label: 'Athleisure', color: '#7DB88F' },
  { value: 'brunch', label: 'Brunch', color: '#CF9D4E' },
  { value: 'dinner', label: 'Dinner', color: '#CF9D4E' },
  { value: 'vacation', label: 'Vacation', color: '#66B3A6' },
  { value: 'wedding_guest', label: 'Wedding guest', color: '#D98080' },
  { value: 'church', label: 'Church', color: '#B98BC9' },
  { value: 'school', label: 'School', color: '#6A9CC9' }
]

interface Look {
  id: string
  title: string
  primary_image_url: string | null
  occasion: string | null
}

interface CalendarDay {
  id: string
  date: string
  occasion: string | null
  notes: string | null
  primary_look_id: string | null
  alternate_look_id: string | null
  lookbook_id: string | null
}

interface Calendar {
  id: string
  title: string
  is_published: boolean
  month: number
  year: number
}

interface CalendarViewProps {
  month: number
  year: number
  calendar: Calendar | null
  days: CalendarDay[]
  looks: Look[]
}

const pad = (n: number) => String(n).padStart(2, '0')

function monthHref(month: number, year: number, step: -1 | 1) {
  const m = month + step
  if (m < 1) return `/admin/calendar?month=12&year=${year - 1}`
  if (m > 12) return `/admin/calendar?month=1&year=${year + 1}`
  return `/admin/calendar?month=${m}&year=${year}`
}

export function CalendarView({ month, year, calendar, days, looks }: CalendarViewProps) {
  const router = useRouter()
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const [localDays, setLocalDays] = useState<CalendarDay[]>(days)
  const [localCalendar, setLocalCalendar] = useState<Calendar | null>(calendar)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<CalendarDay>>({})
  const [lookSearch, setLookSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7
  // Lagos date on both server and browser, so the highlighted day never mismatches during hydration.
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date())

  const dayFor = (date: string) => localDays.find((d) => d.date === date)
  const lookFor = (id: string | null | undefined) => (id ? looks.find((l) => l.id === id) ?? null : null)
  const occasionFor = (value: string | null | undefined) => OCCASIONS.find((o) => o.value === value)

  function openDay(date: string) {
    setSelectedDate(date)
    setDraft(dayFor(date) ?? { date })
    setLookSearch('')
  }

  const closeDay = () => setSelectedDate(null)

  async function ensureCalendar(): Promise<Calendar> {
    if (localCalendar) return localCalendar
    const res = await fetch('/api/stylist/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year, title: `${MONTHS[month - 1]} ${year}` })
    })
    const data = (await res.json().catch(() => null)) as { calendar?: Calendar } | null
    if (!res.ok || !data?.calendar?.id) throw new Error('calendar')
    setLocalCalendar(data.calendar)
    return data.calendar
  }

  async function saveDay() {
    if (!selectedDate) return
    setSaving(true)
    try {
      const cal = await ensureCalendar()
      const res = await fetch(`/api/stylist/calendar/${cal.id}/days`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, notes: draft.notes?.trim() || null, date: selectedDate, calendar_id: cal.id })
      })
      const data = (await res.json().catch(() => null)) as { day?: CalendarDay } | null
      if (!res.ok || !data?.day) throw new Error()
      const saved = data.day
      setLocalDays((prev) => [...prev.filter((d) => d.date !== selectedDate), saved])
      toast.success('Day saved.')
      closeDay()
    } catch {
      toast.error("Couldn't save this day. Try again.")
    } finally {
      setSaving(false)
    }
  }

  async function clearDay() {
    if (!selectedDate || !localCalendar || !dayFor(selectedDate)) return closeDay()
    const ok = await confirm({
      title: 'Clear this day?',
      body: 'The look and notes planned for this day will be removed.',
      confirmLabel: 'Clear',
      danger: true
    })
    if (!ok) return
    try {
      const res = await fetch(`/api/stylist/calendar/${localCalendar.id}/days?date=${selectedDate}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setLocalDays((prev) => prev.filter((d) => d.date !== selectedDate))
      toast.success('Day cleared.')
      closeDay()
    } catch {
      toast.error("Couldn't clear this day. Try again.")
    }
  }

  async function togglePublish() {
    setPublishing(true)
    const next = !localCalendar?.is_published
    try {
      const cal = await ensureCalendar()
      const res = await fetch(`/api/stylist/calendar/${cal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: next })
      })
      if (!res.ok) throw new Error()
      setLocalCalendar({ ...cal, is_published: next })
      toast.success(next ? `${MONTHS[month - 1]} is now visible to clients.` : `${MONTHS[month - 1]} is hidden from clients.`)
    } catch {
      toast.error(`Couldn't ${next ? 'publish' : 'unpublish'} this month. Try again.`)
    } finally {
      setPublishing(false)
    }
  }

  const q = lookSearch.trim().toLowerCase()
  const matchingLooks = q ? looks.filter((l) => l.title.toLowerCase().includes(q)) : looks
  const chosenLook = lookFor(draft.primary_look_id)
  const published = !!localCalendar?.is_published

  return (
    <div>
      {dialog}
      <PageHeader
        title="Calendar"
        actions={
          <Button
            size="sm"
            variant={published ? 'outline' : 'primary'}
            loading={publishing}
            disabled={!localDays.length && !published}
            onClick={() => void togglePublish()}
          >
            {published ? 'Unpublish month' : 'Publish month'}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full bg-white p-1 ring-1 ring-inset ring-atelier-border">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => router.push(monthHref(month, year, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-full text-atelier-muted transition hover:bg-atelier-canvas hover:text-atelier-ink"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="min-w-[9rem] text-center text-sm font-medium text-atelier-ink">
            {MONTHS[month - 1]} {year}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => router.push(monthHref(month, year, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full text-atelier-muted transition hover:bg-atelier-canvas hover:text-atelier-ink"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="flex items-center gap-2 text-sm text-atelier-muted">
          {published ? <Badge tone="green">Visible to clients</Badge> : <Badge>Not published</Badge>}
          <span className="tabular-nums">
            {localDays.length} of {daysInMonth} days planned
          </span>
        </p>
      </div>

      <div className="rounded-2xl border border-atelier-border bg-white p-2 sm:p-4">
        <div className="mb-1 grid grid-cols-7">
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} className="py-1.5 text-center text-xs font-medium text-atelier-faint">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {Array.from({ length: totalCells }, (_, i) => {
            const dayNum = i - firstDay + 1
            if (dayNum < 1 || dayNum > daysInMonth) return <div key={i} aria-hidden />

            const date = `${year}-${pad(month)}-${pad(dayNum)}`
            const day = dayFor(date)
            const look = lookFor(day?.primary_look_id)
            const occasion = occasionFor(day?.occasion)
            const isToday = date === todayStr

            return (
              <button
                key={i}
                type="button"
                onClick={() => openDay(date)}
                aria-label={`${dayNum} ${MONTHS[month - 1]}${day ? `, ${[occasion?.label, look?.title].filter(Boolean).join(', ') || 'planned'}` : ', nothing planned'}`}
                className={`relative flex aspect-square flex-col overflow-hidden rounded-lg text-left ring-1 ring-inset transition hover:ring-purple-dark/40 sm:aspect-[4/5] sm:rounded-xl ${
                  day ? 'bg-white ring-atelier-border' : 'bg-atelier-canvas/60 ring-transparent'
                } ${isToday ? '!ring-2 !ring-gold' : ''}`}
              >
                {look?.primary_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" src={look.primary_image_url} alt="" className="absolute inset-0 hidden h-full w-full object-cover sm:block" />
                ) : null}
                <span
                  className={`relative m-1 inline-flex h-5 min-w-5 items-center justify-center self-start rounded-full px-1 text-xs font-medium tabular-nums ${
                    look?.primary_image_url ? 'sm:bg-white/90' : ''
                  } ${isToday ? 'text-[#8A6420]' : 'text-atelier-ink'}`}
                >
                  {dayNum}
                </span>
                {occasion ? (
                  <span className="relative mt-auto flex items-center gap-1 p-1 sm:p-1.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2" style={{ backgroundColor: occasion.color }} aria-hidden />
                    <span className={`hidden truncate text-[11px] font-medium md:block ${look?.primary_image_url ? 'rounded bg-white/90 px-1 text-atelier-ink' : 'text-atelier-muted'}`}>
                      {occasion.label}
                    </span>
                  </span>
                ) : day ? (
                  <span className="relative mt-auto p-1 sm:p-1.5">
                    <span className="block h-1.5 w-1.5 rounded-full bg-purple-dark/40 sm:h-2 sm:w-2" aria-hidden />
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
      <p className="mt-3 text-sm text-atelier-faint">Tap a day to plan the look for it.</p>

      <Modal
        open={!!selectedDate}
        onClose={() => !saving && closeDay()}
        size="md"
        title={
          selectedDate
            ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
            : ''
        }
      >
        <div className="space-y-5">
          <fieldset>
            <legend className="text-sm font-semibold text-gray-dark">Occasion</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {OCCASIONS.map((o) => {
                const on = draft.occasion === o.value
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setDraft((d) => ({ ...d, occasion: on ? null : o.value }))}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${
                      on ? 'bg-atelier-ink text-white' : 'bg-white text-atelier-muted ring-1 ring-inset ring-atelier-border hover:text-atelier-ink'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: o.color }} aria-hidden />
                    {o.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div>
            <p className="text-sm font-semibold text-gray-dark">Look</p>
            {chosenLook ? (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-atelier-border p-2">
                <LookThumb look={chosenLook} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-atelier-ink">{chosenLook.title}</span>
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, primary_look_id: null }))}
                  className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-purple-dark transition hover:bg-atelier-lavender"
                >
                  Change
                </button>
              </div>
            ) : !looks.length ? (
              <p className="mt-2 rounded-xl border border-dashed border-atelier-border px-4 py-5 text-center text-sm text-atelier-muted">
                Only published looks can go on the calendar.{' '}
                <Link href="/admin/looks/new" className="font-medium text-purple-dark underline underline-offset-2">
                  Create a look
                </Link>
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {looks.length > 6 ? (
                  <SearchInput label="Search looks" placeholder="Search looks…" value={lookSearch} onChange={setLookSearch} />
                ) : null}
                <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-atelier-border p-1">
                  {matchingLooks.map((look) => (
                    <li key={look.id}>
                      <button
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, primary_look_id: look.id }))}
                        className="flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition hover:bg-atelier-canvas"
                      >
                        <LookThumb look={look} />
                        <span className="truncate text-sm text-atelier-ink">{look.title}</span>
                      </button>
                    </li>
                  ))}
                  {!matchingLooks.length ? <li className="px-3 py-3 text-sm text-atelier-faint">No looks match.</li> : null}
                </ul>
              </div>
            )}
          </div>

          <Textarea
            label="Notes"
            rows={2}
            value={draft.notes ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Styling tips for the day"
          />

          <div className="flex flex-wrap justify-between gap-2 border-t border-atelier-border pt-4">
            {selectedDate && dayFor(selectedDate) ? (
              <Button size="sm" variant="ghost" className="!text-red-600 hover:!bg-red-50" disabled={saving} onClick={() => void clearDay()}>
                Clear day
              </Button>
            ) : (
              <span />
            )}
            <Button size="sm" loading={saving} onClick={() => void saveDay()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function LookThumb({ look }: { look: Look }) {
  return look.primary_image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img loading="lazy" src={look.primary_image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-atelier-lavender text-purple-dark">
      <Sparkles className="h-4 w-4" aria-hidden />
    </span>
  )
}
