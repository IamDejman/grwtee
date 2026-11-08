'use client'

import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { useToast } from '@/components/admin/Toast'

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  image_url: string | null
}

interface MessageThreadProps {
  conversationId: string
  initialMessages: Message[]
  currentUserId: string
}

const LAGOS = 'Africa/Lagos'
// New messages are fetched through the site's own API on this interval while the thread is on
// screen, each time looking back a little before the newest one already seen.
const POLL_MS = 4000
const OVERLAP_MS = 30_000

/** Adds the messages the thread doesn't have yet, keeping it in time order. */
function withNew(prev: Message[], fresh: Message[]): Message[] {
  const known = new Set(prev.map((m) => m.id))
  const added = fresh.filter((m) => !known.has(m.id))
  if (!added.length) return prev
  return [...prev, ...added].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
}
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: LAGOS })
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: LAGOS })

export function MessageThread({ conversationId, initialMessages, currentUserId }: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const toast = useToast()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  // The newest message time the server has returned. Polls start from here, not from the newest
  // message on screen: a reply sent from this page shows at once, and starting after it would
  // skip a client message that arrived just before it.
  const seenUntil = useRef<string | null>(initialMessages.at(-1)?.created_at ?? null)

  // New messages from the client, through the site's own API: the browser never reads Supabase,
  // so its tables can stay locked down. Polls run while the thread is on screen.
  useEffect(() => {
    let stopped = false
    let inFlight = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const schedule = () => {
      clearTimeout(timer)
      if (!stopped && !document.hidden) timer = setTimeout(poll, POLL_MS)
    }

    async function poll() {
      if (stopped || inFlight) return
      inFlight = true
      const since = seenUntil.current ? new Date(Date.parse(seenUntil.current) - OVERLAP_MS).toISOString() : new Date(0).toISOString()
      try {
        const res = await fetch(
          `/api/stylist/messages?conversation_id=${encodeURIComponent(conversationId)}&after=${encodeURIComponent(since)}`,
          { cache: 'no-store' }
        )
        // Signed out, blocked or the conversation is gone: stop asking.
        if (res.status === 401 || res.status === 403 || res.status === 404) stopped = true
        else if (res.ok) {
          const fresh = ((await res.json()) as { messages?: Message[] }).messages ?? []
          if (fresh.length) {
            seenUntil.current = fresh[fresh.length - 1].created_at
            setMessages((prev) => withNew(prev, fresh))
          }
        }
      } catch {
        // Offline for a moment: the next poll catches up.
      } finally {
        inFlight = false
      }
      schedule()
    }

    const onVisibility = () => {
      if (document.hidden) clearTimeout(timer)
      else void poll() // catch up as soon as the thread is back on screen
    }

    schedule()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [conversationId])

  function resize() {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/stylist/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, content: text })
      })
      const data = (await res.json().catch(() => null)) as { message?: Message } | null
      if (!res.ok || !data?.message) throw new Error()
      const sent = data.message
      // Show it straight away; polls skip it later because the id matches.
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]))
      setInput('')
      requestAnimationFrame(resize)
    } catch {
      toast.error("Couldn't send your message. Try again.")
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  return (
    <>
      <div className="flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6" aria-live="polite">
        {!messages.length ? (
          <p className="flex h-full items-center justify-center text-sm text-atelier-faint">No messages yet. Say hello below.</p>
        ) : null}

        {messages.map((msg, i) => {
          const mine = msg.sender_id === currentUserId
          const day = dayLabel(msg.created_at)
          const newDay = i === 0 || dayLabel(messages[i - 1].created_at) !== day
          return (
            <div key={msg.id}>
              {newDay ? (
                <div className="flex items-center gap-3 py-3" role="separator">
                  <span className="h-px flex-1 bg-atelier-border" />
                  <span className="text-xs font-medium text-atelier-faint">{day}</span>
                  <span className="h-px flex-1 bg-atelier-border" />
                </div>
              ) : null}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed sm:max-w-[70%] ${
                    mine ? 'rounded-br-md bg-purple-dark text-white' : 'rounded-bl-md bg-white text-atelier-ink ring-1 ring-inset ring-atelier-border'
                  }`}
                >
                  {msg.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={msg.image_url} alt="Photo from the conversation" className="mb-1.5 w-full max-w-xs rounded-xl" />
                  ) : null}
                  {msg.content ? <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{msg.content}</p> : null}
                  <p className={`mt-0.5 text-right text-[11px] tabular-nums ${mine ? 'text-white/60' : 'text-atelier-faint'}`}>{timeLabel(msg.created_at)}</p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form
        className="shrink-0 border-t border-atelier-border bg-white px-3 py-3 sm:px-5"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-atelier-border bg-atelier-canvas/60 py-1.5 pl-4 pr-1.5 focus-within:border-purple-dark/40 focus-within:ring-2 focus-within:ring-purple-dark/10">
          <label htmlFor="reply" className="sr-only">
            Message
          </label>
          <textarea
            id="reply"
            ref={inputRef}
            value={input}
            rows={1}
            placeholder="Write a message…"
            onChange={(e) => {
              setInput(e.target.value)
              resize()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void send()
              }
            }}
            className="max-h-32 min-h-[2.25rem] flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed text-atelier-ink outline-none placeholder:text-atelier-faint"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!input.trim() || sending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-dark text-white transition hover:bg-purple-medium disabled:bg-atelier-lavender disabled:text-atelier-faint"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-1.5 hidden text-center text-xs text-atelier-faint sm:block">Enter to send, Shift + Enter for a new line</p>
      </form>
    </>
  )
}
