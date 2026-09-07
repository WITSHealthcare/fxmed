'use client'

import { useState, useEffect, useCallback } from 'react'
import { EnvelopeSimpleIcon } from '@phosphor-icons/react'

type MessageSource = 'contact_form' | 'health_assessment' | 'functional_health_analysis'

type Message = {
  id: string
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
  status: 'unread' | 'read' | 'archived'
  // Absent until migration 029 is applied, and on rows written before it.
  source?: MessageSource
  created_at: string
  updated_at: string
}

const sourceLabels: Record<MessageSource, string> = {
  contact_form: 'Contact form',
  health_assessment: 'Health assessment',
  functional_health_analysis: 'Functional health analysis',
}

// Rows predating the source column are recognised by the subject each form
// writes, so the inbox labels them correctly before the migration is applied.
const messageSource = (message: Message): MessageSource => {
  if (message.source) return message.source
  const subject = message.subject || ''
  if (/^functional health analysis:/i.test(subject)) return 'functional_health_analysis'
  if (/^health assessment:/i.test(subject)) return 'health_assessment'
  return 'contact_form'
}

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'archived'>('all')
  const [sourceFilter, setSourceFilter] = useState<'all' | MessageSource>('all')

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      if (sourceFilter !== 'all') params.set('source', sourceFilter)
      const query = params.toString()
      const response = await fetch(query ? `/api/messages?${query}` : '/api/messages')
      if (!response.ok) throw new Error('Failed to fetch messages')

      const { messages: data } = await response.json()
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }, [filter, sourceFilter])

  const updateMessageStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!response.ok) throw new Error('Failed to update message')
      
      fetchMessages()
    } catch (error) {
      console.error('Error updating message:', error)
    }
  }

  const deleteMessage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    
    try {
      const response = await fetch(`/api/messages?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete message')
      
      fetchMessages()
      if (selectedMessage?.id === id) setSelectedMessage(null)
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const unreadCount = messages.filter(m => m.status === 'unread').length

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-dm-sans font-bold text-green-deep">
          Messages
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="bg-green-deep text-white text-sm font-semibold px-3 py-1 rounded-full">
              {unreadCount} unread
            </span>
          </div>
          <button
            onClick={fetchMessages}
            className="font-dm-sans text-green-deep text-sm font-medium hover:text-green-mid"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'unread', 'read', 'archived'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-full font-dm-sans text-sm font-medium capitalize transition-all ${
              filter === status
                ? 'bg-green-deep text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Source Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {([
          ['all', 'All sources'],
          ['contact_form', sourceLabels.contact_form],
          ['health_assessment', sourceLabels.health_assessment],
          ['functional_health_analysis', sourceLabels.functional_health_analysis],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setSourceFilter(value)}
            className={`px-4 py-2 rounded-full font-dm-sans text-sm font-medium transition-all ${
              sourceFilter === value
                ? 'bg-green-mid text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-deep mx-auto mb-4"></div>
          <p className="font-dm-sans text-text-mid">Loading messages...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">�</div>
          <h3 className="text-xl font-dm-sans font-bold text-green-deep mb-2">
            No messages
          </h3>
          <p className="font-dm-sans text-text-mid">
            {filter === 'all' ? 'No messages yet' : `No ${filter} messages`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages List */}
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                onClick={() => setSelectedMessage(message)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedMessage?.id === message.id
                    ? 'border-green-deep bg-green-deep/5'
                    : message.status === 'unread'
                    ? 'border-gold bg-gold/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      messageSource(message) === 'functional_health_analysis'
                        ? 'bg-gold/25 text-green-deep'
                        : messageSource(message) === 'health_assessment'
                        ? 'bg-green-mid/15 text-green-mid'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {sourceLabels[messageSource(message)]}
                    </span>
                    <h4 className="font-dm-sans font-semibold text-green-deep mb-1">
                      {message.name}
                    </h4>
                    <p className="font-dm-sans text-text-mid text-sm">
                      {message.email}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    message.status === 'unread' ? 'bg-gold text-green-deep' :
                    message.status === 'read' ? 'bg-green-deep text-white' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {message.status}
                  </span>
                </div>
                <p className="font-dm-sans text-text-mid text-sm line-clamp-2">
                  {message.message}
                </p>
                <p className="font-dm-sans text-text-mid text-xs mt-2">
                  {formatDate(message.created_at)}
                </p>
              </div>
            ))}
          </div>

          {/* Message Detail */}
          <div className="bg-cream rounded-xl p-6 sticky top-6">
            {selectedMessage ? (
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-dm-sans font-bold text-green-deep text-xl mb-1">
                      {selectedMessage.name}
                    </h4>
                    <p className="font-dm-sans text-text-mid text-sm">
                      {selectedMessage.email}
                    </p>
                    {selectedMessage.phone && (
                      <p className="font-dm-sans text-text-mid text-sm">
                        {selectedMessage.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedMessage.status}
                      onChange={(e) => updateMessageStatus(selectedMessage.id, e.target.value)}
                      className="px-3 py-1 rounded-lg border border-gray-300 font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-green-deep"
                    >
                      <option value="unread">Unread</option>
                      <option value="read">Read</option>
                      <option value="archived">Archived</option>
                    </select>
                    <button
                      onClick={() => deleteMessage(selectedMessage.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {selectedMessage.subject && (
                  <h5 className="font-dm-sans font-semibold text-green-deep mb-2">
                    {selectedMessage.subject}
                  </h5>
                )}
                <div className="bg-white rounded-lg p-4 mb-4">
                  <p className="font-dm-sans text-text-mid whitespace-pre-wrap">
                    {selectedMessage.message}
                  </p>
                </div>
                <p className="font-dm-sans text-text-mid text-xs">
                  Received: {formatDate(selectedMessage.created_at)}
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <EnvelopeSimpleIcon size={42} weight="duotone" className="mx-auto mb-2 text-green-mid" />
                <p className="font-dm-sans text-text-mid">
                  Select a message to view details
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
