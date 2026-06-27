'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Image as ImageIcon } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  message_type: string | null
  media_url: string | null
}

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface MessageThreadProps {
  conversationId: string
  initialMessages: Message[]
  currentUserId: string
  clientProfile: Profile | null
  stylistProfile: Profile | null
}

export function MessageThread({ conversationId, initialMessages, currentUserId, clientProfile, stylistProfile }: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Subscribe to new messages via Supabase realtime
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        const newMsg = payload.new as Message
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)

    const res = await fetch(`/api/stylist/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conversationId, content: text, message_type: 'text' })
    })

    setSending(false)
    if (!res.ok) setInput(text)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function getAvatar(senderId: string) {
    const profile = senderId === currentUserId ? stylistProfile : clientProfile
    const name = profile?.full_name ?? '?'
    const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    return { avatar_url: profile?.avatar_url, initials }
  }

  // Group messages by date
  let lastDate = ''

  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center" style={{ color: '#9A8DAA' }}>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation below</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId
          const date = new Date(msg.created_at)
          const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
          const showDate = dateStr !== lastDate
          lastDate = dateStr

          const { avatar_url, initials } = getAvatar(msg.sender_id)

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px" style={{ backgroundColor: '#EAE4D8' }} />
                  <span className="text-[11px] font-medium" style={{ color: '#9A8DAA' }}>{dateStr}</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: '#EAE4D8' }} />
                </div>
              )}

              <div className={`flex items-end gap-2.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                {avatar_url ? (
                  <img src={avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mb-0.5" />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 mb-0.5"
                    style={{ backgroundColor: isMine ? '#422D64' : '#F2EDF8', color: isMine ? '#FFFFFF' : '#422D64' }}
                  >
                    {initials}
                  </div>
                )}

                {/* Bubble */}
                <div
                  className="max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                  style={{
                    backgroundColor: isMine ? '#422D64' : '#FFFFFF',
                    color: isMine ? '#FFFFFF' : '#1A1428',
                    border: isMine ? 'none' : '1px solid #EAE4D8',
                    borderBottomRightRadius: isMine ? '4px' : '16px',
                    borderBottomLeftRadius: isMine ? '16px' : '4px'
                  }}
                >
                  {msg.media_url && (
                    <img src={msg.media_url} alt="Image" className="w-full rounded-xl mb-2 max-w-xs" />
                  )}
                  {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-right text-purple-200' : 'text-right'}`} style={{ color: isMine ? 'rgba(255,255,255,0.5)' : '#9A8DAA' }}>
                    {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="shrink-0 px-4 lg:px-8 py-4"
        style={{ borderTop: '1px solid #EAE4D8', backgroundColor: 'rgba(248,245,238,0.95)', backdropFilter: 'blur(12px)' }}
      >
        <div
          className="flex items-end gap-3 rounded-2xl px-4 py-3"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #D4C9BB' }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message…"
            rows={1}
            className="flex-1 resize-none outline-none text-sm leading-relaxed bg-transparent"
            style={{ color: '#1A1428', minHeight: '24px', maxHeight: '120px' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`
            }}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
            style={{
              backgroundColor: input.trim() ? '#422D64' : '#F2EDF8',
              color: input.trim() ? '#FFFFFF' : '#B0A0C4'
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] mt-1.5 text-center" style={{ color: '#B0A0C4' }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </>
  )
}
