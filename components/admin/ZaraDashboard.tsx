'use client'

import { useState, useEffect, useCallback } from 'react'

interface ChatSession {
  id: string
  created_at: string
  last_message_at: string
  visitor_name: string | null
  visitor_email: string | null
  visitor_phone: string | null
  booked: boolean
  message_count: number
}

interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ZaraDashboard() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [filter, setFilter] = useState<'all' | 'booked' | 'browsing'>('all')
  const [search, setSearch] = useState('')

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true)
    try {
      const res = await fetch('/api/zara')
      const data = await res.json()
      setSessions(data.sessions ?? [])
    } catch (err) {
      console.error('Failed to load sessions:', err)
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const openSession = async (session: ChatSession) => {
    setSelectedSession(session)
    setLoadingMessages(true)
    try {
      const res = await fetch('/api/zara', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      })
      const data = await res.json()
      setMessages(data.messages ?? [])
    } catch (err) {
      console.error('Failed to load messages:', err)
    } finally {
      setLoadingMessages(false)
    }
  }

  const filteredSessions = sessions.filter(s => {
    if (filter === 'booked' && !s.booked) return false
    if (filter === 'browsing' && s.booked) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        s.visitor_name?.toLowerCase().includes(q) ||
        s.visitor_email?.toLowerCase().includes(q) ||
        s.visitor_phone?.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      )
    }
    return true
  })

  const bookedCount = sessions.filter(s => s.booked).length
  const browsingCount = sessions.length - bookedCount

  return (
    <div className="flex gap-6 h-[calc(100vh-240px)] min-h-[500px]">
      {/* Sessions list */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-3">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-[12px] p-3 shadow-sm border border-green-deep/10 text-center">
            <div className="font-dm-sans font-bold text-green-deep text-xl">{sessions.length}</div>
            <div className="font-dm-sans text-text-mid text-xs">Total</div>
          </div>
          <div className="bg-white rounded-[12px] p-3 shadow-sm border border-green-deep/10 text-center">
            <div className="font-dm-sans font-bold text-green-mid text-xl">{bookedCount}</div>
            <div className="font-dm-sans text-text-mid text-xs">Booked</div>
          </div>
          <div className="bg-white rounded-[12px] p-3 shadow-sm border border-green-deep/10 text-center">
            <div className="font-dm-sans font-bold text-amber-500 text-xl">{browsingCount}</div>
            <div className="font-dm-sans text-text-mid text-xs">Browsing</div>
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="font-dm-sans text-sm border border-green-deep/20 rounded-[10px] px-3 py-2 outline-none focus:border-green-mid"
          />
          <div className="flex gap-1">
            {(['all', 'booked', 'browsing'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 font-dm-sans text-xs py-1.5 rounded-[8px] capitalize transition-all ${
                  filter === f
                    ? 'bg-green-deep text-white'
                    : 'bg-white text-text-mid border border-green-deep/20 hover:border-green-deep/50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
          {loadingSessions ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-deep" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center text-text-mid font-dm-sans text-sm py-10">
              No conversations yet
            </div>
          ) : (
            filteredSessions.map(session => (
              <button
                key={session.id}
                onClick={() => openSession(session)}
                className={`w-full text-left bg-white rounded-[12px] p-3 shadow-sm border transition-all ${
                  selectedSession?.id === session.id
                    ? 'border-green-mid ring-1 ring-green-mid/30'
                    : 'border-green-deep/10 hover:border-green-deep/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-dm-sans font-semibold text-green-deep text-sm truncate">
                    {session.visitor_name ?? 'Anonymous visitor'}
                  </span>
                  {session.booked && (
                    <span className="flex-shrink-0 bg-green-mid/15 text-green-mid text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Booked
                    </span>
                  )}
                </div>
                {session.visitor_email && (
                  <div className="font-dm-sans text-text-mid text-xs truncate mb-1">
                    {session.visitor_email}
                  </div>
                )}
                <div className="font-dm-sans text-text-mid text-xs">
                  {timeAgo(session.last_message_at)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Conversation pane */}
      <div className="flex-1 bg-white rounded-[20px] shadow-sm border border-green-deep/10 flex flex-col overflow-hidden">
        {!selectedSession ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="text-5xl mb-4">🤖</div>
            <h3 className="font-dm-sans font-semibold text-green-deep text-lg mb-2">Zara Conversations</h3>
            <p className="font-dm-sans text-text-mid text-sm max-w-xs">
              Select a conversation on the left to read the full chat thread.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-green-deep/10 flex items-center justify-between">
              <div>
                <div className="font-dm-sans font-semibold text-green-deep">
                  {selectedSession.visitor_name ?? 'Anonymous visitor'}
                </div>
                <div className="font-dm-sans text-text-mid text-xs mt-0.5 flex gap-3">
                  {selectedSession.visitor_email && <span>{selectedSession.visitor_email}</span>}
                  {selectedSession.visitor_phone && <span>{selectedSession.visitor_phone}</span>}
                  <span>Started {formatDate(selectedSession.created_at)}</span>
                </div>
              </div>
              {selectedSession.booked && (
                <span className="bg-green-mid/15 text-green-mid text-xs font-bold px-3 py-1 rounded-full">
                  Appointment Booked
                </span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-deep" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-text-mid font-dm-sans text-sm py-10">
                  No messages found for this session.
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-[16px] px-4 py-2.5 ${
                        msg.role === 'user'
                          ? 'bg-green-deep text-white rounded-br-[4px]'
                          : 'bg-[#F5F7F0] text-green-deep rounded-bl-[4px]'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="font-dm-sans font-semibold text-green-mid text-[11px] mb-1">Zara</div>
                      )}
                      <p className="font-dm-sans text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <div className={`font-dm-sans text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-text-mid'}`}>
                        {formatDate(msg.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
