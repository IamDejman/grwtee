'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Panel, SwitchRow } from '@/components/admin/ui'
import { useToast } from '@/components/admin/Toast'
import { ChipPicker, EditorHeader, ImageField, ItemCard } from '@/components/stylist/FormParts'
import { LOOKBOOK_STATUSES, LOOKBOOK_TYPES } from '@/lib/stylist-labels'

interface LookbookItem {
  id?: string
  name: string
  brand: string
  category: string
  image_url: string
  price: string
  purchase_url: string
  notes: string
  sort_order: number
}

export type ClientOption = { id: string; name: string }

interface LookbookFormProps {
  clients: ClientOption[]
  defaultClientId?: string
  initialData?: {
    id: string
    title: string
    type: string
    custom_type: string | null
    cover_image_url: string | null
    event_date_start: string | null
    event_date_end: string | null
    description: string | null
    status: string
    assigned_to: string | null
    is_published: boolean
    show_in_feed: boolean
    lookbook_items: LookbookItem[]
  }
}

export function LookbookForm({ clients, defaultClientId, initialData }: LookbookFormProps) {
  const router = useRouter()
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const isEdit = !!initialData?.id

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [type, setType] = useState(initialData?.type ?? 'custom')
  const [customType, setCustomType] = useState(initialData?.custom_type ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.cover_image_url ?? '')
  const [dateStart, setDateStart] = useState(initialData?.event_date_start?.split('T')[0] ?? '')
  const [dateEnd, setDateEnd] = useState(initialData?.event_date_end?.split('T')[0] ?? '')
  const [status, setStatus] = useState(initialData?.status ?? 'draft')
  const [assignedTo, setAssignedTo] = useState(initialData?.assigned_to ?? defaultClientId ?? '')
  const [isPublished, setIsPublished] = useState(initialData?.is_published ?? false)
  const [showInFeed, setShowInFeed] = useState(initialData?.show_in_feed ?? false)
  const [items, setItems] = useState<LookbookItem[]>(
    (initialData?.lookbook_items ?? []).map((item) => ({ ...item, price: item.price == null ? '' : String(item.price) }))
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [titleError, setTitleError] = useState('')

  // Keep a client who is no longer in the list selectable, so saving doesn't silently unassign them.
  const clientOptions = [
    { value: '', label: 'No one (general lookbook)' },
    ...clients.map((c) => ({ value: c.id, label: c.name })),
    ...(assignedTo && !clients.some((c) => c.id === assignedTo) ? [{ value: assignedTo, label: 'Current client' }] : [])
  ]

  function updateItem(idx: number, field: keyof LookbookItem, value: string) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  async function save() {
    if (!title.trim()) {
      setTitleError('Give the lookbook a title.')
      document.getElementById('lookbook-title')?.focus()
      return
    }
    if (dateStart && dateEnd && dateEnd < dateStart) {
      setError('The end date is before the start date.')
      return
    }
    if (items.some((item) => !item.name.trim())) {
      setError('Every item needs a name, or remove the empty ones.')
      return
    }
    setTitleError('')
    setError('')
    setBusy(true)

    const body = {
      title: title.trim(),
      type,
      custom_type: type === 'custom' ? customType.trim() || null : null,
      description: description.trim() || null,
      cover_image_url: coverImageUrl || null,
      event_date_start: dateStart || null,
      event_date_end: dateEnd || null,
      status,
      assigned_to: assignedTo || null,
      is_published: isPublished,
      show_in_feed: showInFeed,
      items: items.map((item, i) => ({ ...item, price: item.price.replace(/[^0-9.]/g, ''), sort_order: i }))
    }

    try {
      const res = await fetch(isEdit ? `/api/stylist/lookbooks/${initialData.id}` : '/api/stylist/lookbooks', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "Couldn't save the lookbook. Try again.")
        return
      }
      toast.success('Lookbook saved.')
      router.push('/admin/lookbooks')
      router.refresh()
    } catch {
      setError("Couldn't save the lookbook. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!initialData) return
    const ok = await confirm({
      title: `Delete "${initialData.title}"?`,
      body: "The client will no longer see it. This can't be undone.",
      confirmLabel: 'Delete',
      danger: true
    })
    if (!ok) return
    setBusy(true)
    try {
      const res = await fetch(`/api/stylist/lookbooks/${initialData.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Lookbook deleted.')
      router.push('/admin/lookbooks')
      router.refresh()
    } catch {
      toast.error("Couldn't delete the lookbook. Try again.")
      setBusy(false)
    }
  }

  return (
    <div>
      {dialog}
      <EditorHeader
        backHref="/admin/lookbooks"
        backLabel="Back to lookbooks"
        title={isEdit ? 'Edit lookbook' : 'New lookbook'}
        actions={
          <>
            {isEdit ? (
              <Button size="sm" variant="ghost" className="!text-red-600 hover:!bg-red-50" disabled={busy} onClick={() => void remove()}>
                Delete
              </Button>
            ) : null}
            <Button size="sm" loading={busy} onClick={() => void save()}>
              Save
            </Button>
          </>
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <Panel title="Details">
            <div className="space-y-4">
              <Input
                id="lookbook-title"
                label="Title"
                required
                value={title}
                error={titleError || undefined}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lagos wedding weekend"
              />
              <ChipPicker label="Type" options={LOOKBOOK_TYPES} selected={[type]} onToggle={setType} />
              {type === 'custom' ? (
                <Input label="Custom type" value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="e.g. Graduation" />
              ) : null}
              <Textarea
                label="Description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this lookbook for?"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Event starts" type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
                <Input label="Event ends" type="date" value={dateEnd} min={dateStart || undefined} onChange={(e) => setDateEnd(e.target.value)} />
              </div>
            </div>
          </Panel>

          <Panel
            title="Items"
            actions={
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    { name: '', brand: '', category: 'top', image_url: '', price: '', purchase_url: '', notes: '', sort_order: prev.length }
                  ])
                }
              >
                Add item
              </Button>
            }
          >
            {!items.length ? (
              <p className="rounded-xl border border-dashed border-atelier-border px-4 py-8 text-center text-sm text-atelier-muted">
                Add the pieces clients can shop from this lookbook.
              </p>
            ) : (
              <ul className="space-y-3">
                {items.map((item, idx) => (
                  <ItemCard key={item.id ?? idx} index={idx} onRemove={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
                    <Input label="Name" required value={item.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} placeholder="e.g. Gele, emerald" />
                    <Input label="Brand" value={item.brand} onChange={(e) => updateItem(idx, 'brand', e.target.value)} />
                    <Input label="Price" inputMode="decimal" value={item.price} onChange={(e) => updateItem(idx, 'price', e.target.value)} />
                    <div className="sm:col-span-2">
                      <Input label="Shop link" type="url" value={item.purchase_url} onChange={(e) => updateItem(idx, 'purchase_url', e.target.value)} placeholder="https://" />
                    </div>
                    <div className="sm:col-span-2">
                      <Input label="Photo link" type="url" value={item.image_url} onChange={(e) => updateItem(idx, 'image_url', e.target.value)} placeholder="https://" />
                    </div>
                  </ItemCard>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Client">
            <div className="space-y-4">
              <Select label="For" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} options={clientOptions} />
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={LOOKBOOK_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              />
              <SwitchRow label="Client can see it" checked={isPublished} onChange={setIsPublished} />
              <SwitchRow label="Show to everyone in the app feed" checked={showInFeed} onChange={setShowInFeed} />
            </div>
          </Panel>
          <Panel>
            <ImageField label="Cover photo" value={coverImageUrl} onChange={setCoverImageUrl} onError={setError} />
          </Panel>
        </div>
      </div>
    </div>
  )
}
