'use client'

import { useCallback, useState, useEffect } from 'react'
import { BellIcon, CalendarCheckIcon, ChatCircleDotsIcon, GearSixIcon } from '@phosphor-icons/react'

type Notification = {
  id: string
  type: 'message' | 'appointment' | 'system'
  title: string
  message: string
  timestamp: string
  read: boolean
  link?: string
}

export default function Notifications() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    try {
      const messagesResponse = await fetch('/api/messages?status=unread', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      if (!messagesResponse.ok) {
        if (messagesResponse.status === 401 || messagesResponse.status === 403) {
          setNotifications([])
          setUnreadCount(0)
        }
        return
      }
      const payload = await messagesResponse.json()
      const unreadMessages = Array.isArray(payload.messages) ? payload.messages : []
      
      const notificationsData: Notification[] = unreadMessages.map((msg: any) => ({
        id: msg.id,
        type: 'message' as const,
        title: `New message from ${msg.name || 'a visitor'}`,
        message: String(msg.message || '').substring(0, 100) + (String(msg.message || '').length > 100 ? '...' : ''),
        timestamp: msg.created_at,
        read: false,
        link: '/admin?tab=messages'
      }))

      setNotifications(notificationsData)
      setUnreadCount(notificationsData.length)
    } catch {
      // A polling request can briefly fail during local hot reloads, deployments,
      // sleep/wake or a lost connection. Keep the last successful state and retry.
    }
  }, [])

  const persistReadStatus = async (ids: string[]) => {
    const response = await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ids, status: 'read' }),
    })

    if (!response.ok) throw new Error('Failed to mark notifications as read')
  }

  const markAsRead = async (id: string) => {
    const notification = notifications.find(item => item.id === id)
    if (!notification || notification.read) return

    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))

    try {
      await persistReadStatus([id])
    } catch {
      await fetchNotifications()
    }
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(notification => !notification.read).map(notification => notification.id)
    if (!unreadIds.length) return

    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)

    try {
      await persistReadStatus(unreadIds)
      await fetchNotifications()
    } catch {
      await fetchNotifications()
    }
  }

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void fetchNotifications()
    }
    refresh()
    const interval = window.setInterval(refresh, 60000)
    window.addEventListener('online', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('online', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [fetchNotifications])

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative">
      {/* Notification Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={isOpen}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-green-deep/10 bg-white text-green-deep shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-mid/30 hover:shadow-md"
      >
        <BellIcon size={22} weight="duotone" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-green-deep ring-2 ring-[#f7f5ee]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full z-50 mt-3 max-h-[28rem] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between bg-green-deep px-5 py-4 text-white">
              <h3 className="font-dm-sans font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => void markAllAsRead()}
                  className="text-xs font-dm-sans hover:text-gold transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-72">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <BellIcon size={38} weight="duotone" className="mx-auto mb-3 text-green-mid" />
                  <p className="font-dm-sans text-text-mid text-sm">
                    No new notifications
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-gold/10' : ''
                    }`}
                    onClick={async () => {
                      await markAsRead(notification.id)
                      if (notification.link) {
                        window.location.href = notification.link
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px] bg-green-mid/10 text-green-mid">
                        {notification.type === 'message' && (
                          <ChatCircleDotsIcon size={20} weight="duotone" />
                        )}
                        {notification.type === 'appointment' && (
                          <CalendarCheckIcon size={20} weight="duotone" />
                        )}
                        {notification.type === 'system' && (
                          <GearSixIcon size={20} weight="duotone" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-dm-sans font-semibold text-green-deep text-sm mb-1">
                          {notification.title}
                        </h4>
                        <p className="font-dm-sans text-text-mid text-xs line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="font-dm-sans text-text-mid text-xs mt-1">
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0 w-2 h-2 bg-gold rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    window.location.href = '/admin?tab=messages'
                  }}
                  className="w-full text-center font-dm-sans text-sm text-green-deep hover:text-green-mid transition-colors"
                >
                  View all messages
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
