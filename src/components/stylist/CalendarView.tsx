'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, X, Check, Globe } from 'lucide-react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const OCCASIONS = [
  { value: 'casual', label: 'Casual', color: '#7DCEA0' },
  { value: 'corporate', label: 'Corporate', color: '#5DADE2' },
  { value: 'date_night', label: 'Date Night', color: '#C39BD3' },
  { value: 'formal', label: 'Formal', color: '#F0B27A' },
  { value: 'streetwear', label: 'Streetwear', color: '#F1948A' },
  { value: 'athleisure', label: 'Athleisure', color: '#82E0AA' },
  { value: 'brunch', label: 'Brunch', color: '#F8C471' },
  { value: 'vacation', label: 'Vacation', color: '#76D7C4' },
  { value: 'wedding_guest', label: 'Wedding Guest', color: '#F1948A' },
  { value: 'work', label: 'Work', color: '#85C1E9' },
  { value: 'church', label: 'Church', color: '#D7BDE2' },
  { value: 'dinner', label: 'Dinner', color: '#FAD7A0' },
  { value: 'school', label: 'School', color: '#A9CCE3' }
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
  stylistId: string
  month: number
  year: number
  calendar: Calendar | null
  days: CalendarDay[]
  looks: Look[]
}

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfMonth(month: number, year: number) {
  return new Date(year, month - 1, 1).getDay()
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function CalendarView({ stylistId, month, year, calendar, days, looks }: CalendarViewProps) {
  const router = useRouter()
  const [localDays, setLocalDays] = useState<CalendarDay[]>(days)
  const [localCalendar, setLocalCalendar] = useState<Calendar | null>(calendar)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editPanel, setEditPanel] = useState<Partial<CalendarDay>>({})
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [lookSearch, setLookSearch] = useState('')

  const daysInMonth = getDaysInMonth(month, year)
  const firstDay = getFirstDayOfMonth(month, year)
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  function getDayData(dateStr: string) {
    return localDays.find((d) => d.date === dateStr)
  }

  function getOccasionColor(occ: string | null | undefined) {
    if (!occ) return null
    return OCCASIONS.find((o) => o.value === occ)?.color ?? '#B0A0C4'
  }

  function getLook(id: string | null | undefined) {
    if (!id) return null
    return looks.find((l) => l.id === id) ?? null
  }

  function openDay(dateStr: string) {
    const existing = getDayData(dateStr)
    setSelectedDate(dateStr)
    setEditPanel(existing ?? { date: dateStr })
    setLookSearch('')
  }

  function closePanel() {
    setSelectedDate(null)
    setEditPanel({})
  }

  async function ensureCalendar() {
    if (localCalendar) return localCalendar.id

    const res = await fetch('/api/stylist/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year, title: `${MONTHS[month - 1]} ${year}` })
    })
    const data = await res.json()
    setLocalCalendar(data.calendar)
    return data.calendar.id as string
  }

  async function saveDay() {
    if (!selectedDate) return
    setSaving(true)

    try {
      const calendarId = await ensureCalendar()

      const res = await fetch(`/api/stylist/calendar/${calendarId}/days`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editPanel, date: selectedDate, calendar_id: calendarId })
      })

      if (res.ok) {
        const data = await res.json()
        setLocalDays((prev) => {
          const filtered = prev.filter((d) => d.date !== selectedDate)
          return [...filtered, data.day]
        })
        closePanel()
      }
    } finally {
      setSaving(false)
    }
  }

  async function clearDay() {
    if (!selectedDate || !localCalendar) return
    const existing = getDayData(selectedDate)
    if (!existing) {
      closePanel()
      return
    }

    await fetch(`/api/stylist/calendar/${localCalendar.id}/days?date=${selectedDate}`, {
      method: 'DELETE'
    })
    setLocalDays((prev) => prev.filter((d) => d.date !== selectedDate))
    closePanel()
  }

  async function togglePublish() {
    if (!localCalendar) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/stylist/calendar/${localCalendar.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !localCalendar.is_published })
      })
      if (res.ok) {
        setLocalCalendar((prev) =>
          prev ? { ...prev, is_published: !prev.is_published } : prev
        )
      }
    } finally {
      setPublishing(false)
    }
  }

  function prevMonth() {
    const d = month === 1 ? { m: 12, y: year - 1 } : { m: month - 1, y: year }
    router.push(`/stylist/calendar?month=${d.m}&year=${d.y}`)
  }

  function nextMonth() {
    const d = month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year }
    router.push(`/stylist/calendar?month=${d.m}&year=${d.y}`)
  }

  const filteredLooks = looks.filter((l) =>
    l.title.toLowerCase().includes(lookSearch.toLowerCase())
  )

  const selectedLook = getLook(editPanel.primary_look_id)
  const altLook = getLook(editPanel.alternate_look_id)

  return (
    <div className="min-h-full" style={{ backgroundColor: '#F8F5EE' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-6 lg:px-8 py-5 flex items-center justify-between"
        style={{
          backgroundColor: 'rgba(248,245,238,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #EAE4D8'
        }}
      >
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#9A8DAA' }}>
              Monthly
            </p>
            <h1
              className="text-2xl lg:text-3xl font-light leading-tight mt-0.5"
              style={{
                fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif',
                color: '#1A1428'
              }}
            >
              Calendar
            </h1>
          </div>

          {/* Month nav */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl ml-4"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8' }}
          >
            <button onClick={prevMonth} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100">
              <ChevronLeft className="w-4 h-4" style={{ color: '#5A4D6A' }} />
            </button>
            <span
              className="text-sm font-medium px-2"
              style={{ color: '#1A1428', minWidth: '130px', textAlign: 'center' }}
            >
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={nextMonth} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100">
              <ChevronRight className="w-4 h-4" style={{ color: '#5A4D6A' }} />
            </button>
          </div>
        </div>

        {/* Publish toggle */}
        <button
          onClick={togglePublish}
          disabled={publishing}
          className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium transition-all"
          style={{
            backgroundColor: localCalendar?.is_published ? '#0D674E' : '#422D64',
            color: '#FFFFFF',
            opacity: publishing ? 0.7 : 1
          }}
        >
          <Globe className="w-4 h-4" />
          {localCalendar?.is_published ? 'Published' : 'Publish Month'}
        </button>
      </div>

      <div className="px-4 lg:px-6 py-6 flex gap-6">
        {/* Calendar grid */}
        <div className="flex-1 min-w-0">
          {/* Day labels */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_OF_WEEK.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium py-2 tracking-wider"
                style={{ color: '#9A8DAA' }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: totalCells }).map((_, i) => {
              const dayNum = i - firstDay + 1
              const isValidDay = dayNum >= 1 && dayNum <= daysInMonth
              if (!isValidDay) {
                return <div key={i} className="aspect-square rounded-xl" />
              }

              const dateStr = `${year}-${pad(month)}-${pad(dayNum)}`
              const dayData = getDayData(dateStr)
              const primaryLook = getLook(dayData?.primary_look_id)
              const occColor = getOccasionColor(dayData?.occasion)
              const isSelected = selectedDate === dateStr
              const today = new Date()
              const isToday =
                today.getDate() === dayNum &&
                today.getMonth() + 1 === month &&
                today.getFullYear() === year

              return (
                <button
                  key={i}
                  onClick={() => openDay(dateStr)}
                  className="aspect-square rounded-xl p-1.5 flex flex-col items-start justify-between transition-all text-left"
                  style={{
                    backgroundColor: isSelected
                      ? '#422D64'
                      : dayData
                      ? '#FFFFFF'
                      : 'rgba(255,255,255,0.5)',
                    border: '1px solid',
                    borderColor: isSelected
                      ? '#422D64'
                      : isToday
                      ? '#CF9D4E'
                      : '#EAE4D8',
                    boxShadow: dayData ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  <span
                    className="text-xs font-medium leading-none"
                    style={{
                      color: isSelected ? '#CF9D4E' : isToday ? '#CF9D4E' : '#1A1428'
                    }}
                  >
                    {dayNum}
                  </span>

                  <div className="w-full">
                    {primaryLook?.primary_image_url && (
                      <div className="w-full aspect-square rounded-lg overflow-hidden mb-1">
                        <img
                          src={primaryLook.primary_image_url}
                          alt={primaryLook.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {occColor && (
                      <div
                        className="w-full h-1 rounded-full"
                        style={{ backgroundColor: occColor }}
                      />
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3">
            {OCCASIONS.slice(0, 8).map((occ) => (
              <div key={occ.value} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: occ.color }}
                />
                <span className="text-xs capitalize" style={{ color: '#9A8DAA' }}>
                  {occ.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Day editor panel */}
        {selectedDate && (
          <div
            className="w-72 lg:w-80 shrink-0 rounded-2xl p-5 animate-slide-in-right self-start sticky top-24"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8' }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#9A8DAA' }}>
                  Editing
                </p>
                <h3
                  className="text-lg font-light mt-0.5"
                  style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}
                >
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
              </div>
              <button
                onClick={closePanel}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: '#9A8DAA', backgroundColor: '#F8F5EE' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Occasion */}
            <div className="mb-4">
              <label className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: '#5A4D6A' }}>
                Occasion
              </label>
              <div className="flex flex-wrap gap-1.5">
                {OCCASIONS.map((occ) => (
                  <button
                    key={occ.value}
                    onClick={() => setEditPanel((p) => ({
                      ...p,
                      occasion: p.occasion === occ.value ? null : occ.value
                    }))}
                    className="flex items-center gap-1.5 px-2.5 h-7 rounded-full text-xs transition-all"
                    style={{
                      backgroundColor: editPanel.occasion === occ.value ? occ.color + '25' : '#F8F5EE',
                      color: editPanel.occasion === occ.value ? occ.color : '#9A8DAA',
                      border: '1px solid',
                      borderColor: editPanel.occasion === occ.value ? occ.color : 'transparent'
                    }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: occ.color }}
                    />
                    {occ.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary look */}
            <div className="mb-4">
              <label className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: '#5A4D6A' }}>
                Primary Look
              </label>

              {selectedLook ? (
                <div
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: '#F2EDF8', border: '1px solid #E4D8F5' }}
                >
                  {selectedLook.primary_image_url && (
                    <img
                      src={selectedLook.primary_image_url}
                      alt={selectedLook.title}
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <span className="text-sm flex-1 font-medium truncate" style={{ color: '#1A1428' }}>
                    {selectedLook.title}
                  </span>
                  <button
                    onClick={() => setEditPanel((p) => ({ ...p, primary_look_id: null }))}
                    className="shrink-0"
                    style={{ color: '#9A8DAA' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    placeholder="Search looks…"
                    value={lookSearch}
                    onChange={(e) => setLookSearch(e.target.value)}
                    className="w-full px-3 h-9 rounded-xl border text-sm outline-none"
                    style={{ borderColor: '#D4C9BB', backgroundColor: '#F8F5EE', color: '#1A1428' }}
                  />
                  {lookSearch && (
                    <div
                      className="mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                      style={{ border: '1px solid #EAE4D8', backgroundColor: '#FFFFFF' }}
                    >
                      {filteredLooks.slice(0, 8).map((look) => (
                        <button
                          key={look.id}
                          onClick={() => {
                            setEditPanel((p) => ({ ...p, primary_look_id: look.id }))
                            setLookSearch('')
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                        >
                          {look.primary_image_url && (
                            <img
                              src={look.primary_image_url}
                              alt={look.title}
                              className="w-8 h-8 rounded-lg object-cover shrink-0"
                            />
                          )}
                          <span className="text-xs truncate" style={{ color: '#1A1428' }}>
                            {look.title}
                          </span>
                        </button>
                      ))}
                      {filteredLooks.length === 0 && (
                        <p className="px-3 py-3 text-xs" style={{ color: '#9A8DAA' }}>
                          No looks found
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="mb-5">
              <label className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: '#5A4D6A' }}>
                Notes
              </label>
              <textarea
                value={editPanel.notes ?? ''}
                onChange={(e) => setEditPanel((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Styling notes, tips…"
                rows={2}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none"
                style={{ borderColor: '#D4C9BB', backgroundColor: '#F8F5EE', color: '#1A1428' }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={clearDay}
                className="flex-1 h-9 rounded-xl text-xs font-medium transition-all"
                style={{ backgroundColor: '#FEF2F2', color: '#C0392B' }}
              >
                Clear
              </button>
              <button
                onClick={saveDay}
                disabled={saving}
                className="flex-1 h-9 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                style={{ backgroundColor: '#422D64', color: '#FFFFFF', opacity: saving ? 0.7 : 1 }}
              >
                <Check className="w-3.5 h-3.5" />
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
