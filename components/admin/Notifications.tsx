'use client'

import { useCallback, useState, useEffect } from 'react'
import {
  BellIcon,
  CalendarCheckIcon,
  ChatCircleDotsIcon,
  ClipboardTextIcon,
  HeartbeatIcon,
  UserPlusIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'

type NotificationKind = 'message' | 'appointment' | 'registration' | 'contact' | 'assessment'

type Notification = {
  id: string
  kind: NotificationKind
  title: string
  detail: string
  timestamp: string
  link: string
  dismissable: boolean
}

const kindIcons: Record<NotificationKind, typeof BellIcon> = {
  message: ChatCircleDotsIcon,
  appointment: CalendarCheckIcon,
  registration: UserPlusIcon,
  contact: ClipboardTextIcon,
  assessment: HeartbeatIcon,
}

const kindLabels: Record<NotificationKind, string> = {
  message: 'Message',
  appointment: 'Booking',
  registration: 'Registration',
  contact: 'Enquiry',
  assessment: 'Health analysis',
}

export default function Notifications() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [degraded, setDegraded] = useState<NotificationKind[]>([])

  const fetchNotifications = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    try {
      const response = await fetch('/api/admin/notifications', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setNotifications([])
          setDegraded([])
        }
        return
      }
      const payload = await response.json()
      setNotifications(Array.isArray(payload.notifications) ? payload.notifications : [])
      setDegraded(Array.isArray(payload.degraded) ? payload.degraded : [])
    } catch {
      // A polling request can briefly fail during local hot reloads, deployments,
      // sleep/wake or a lost connection. Keep the last successful state and retry.
    }
  }, [])

  // Only messages carry read state. Bookings, enquiries, registrations and
  // health analyses stay listed until someone actions them in their own tab,
  // so the bell cannot be cleared while the work is still outstanding.
  const dismissMessages = async () => {
    const ids = notifications
      .filter(item => item.dismissable)
      .map(item => item.id.split(':').slice(1).join(':'))
    if (!ids.length) return

    setNotifications(current => current.filter(item => !item.dismissable))
    try {
      const response = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ids, status: 'read' }),
      })
      if (!response.ok) throw new Error('Failed to mark messages as read')
    } catch {
      // Put the optimistic removal back the way the server actually sees it.
    } finally {
      await fetchNotifications()
    }
  }

  const openNotification = async (notification: Notification) => {
    if (notification.dismissable) {
      const id = notification.id.split(':').slice(1).join(':')
      try {
        await fetch('/api/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ids: [id], status: 'read' }),
        })
      } catch {
        // Navigating still shows the item, so a failed mark-as-read is not fatal.
      }
    }
    window.location.href = notification.link
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
    if (Number.isNaN(date.getTime())) return ''
    const diffMs = Date.now() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const unreadCount = notifications.length
  const hasMessages = notifications.some(item => item.dismissable)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={unreadCount ? `${unreadCount} items need attention` : 'Notifications'}
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

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 top-full z-50 mt-3 max-h-[28rem] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-green-deep px-5 py-4 text-white">
              <div>
                <h3 className="font-dm-sans font-semibold">Needs attention</h3>
                <p className="mt-0.5 text-[11px] font-dm-sans text-white/60">
                  {unreadCount ? `${unreadCount} open item${unreadCount === 1 ? '' : 's'}` : 'Nothing outstanding'}
                </p>
              </div>
              {hasMessages && (
                <button
                  onClick={() => void dismissMessages()}
                  className="text-xs font-dm-sans transition-colors hover:text-gold"
                >
                  Mark messages read
                </button>
              )}
            </div>

            {degraded.length > 0 && (
              <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5">
                <WarningCircleIcon size={16} weight="duotone" className="mt-0.5 flex-shrink-0 text-amber-700" />
                <p className="font-dm-sans text-[11px] leading-4 text-amber-800">
                  Could not read {degraded.map(kind => kindLabels[kind].toLowerCase()).join(', ')}. The count below may be
                  incomplete.
                </p>
              </div>
            )}

            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <BellIcon size={38} weight="duotone" className="mx-auto mb-3 text-green-mid" />
                  <p className="font-dm-sans text-sm text-text-mid">Nothing needs attention</p>
                </div>
              ) : (
                notifications.map(notification => {
                  const Icon = kindIcons[notification.kind] || BellIcon
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void openNotification(notification)}
                      className="flex w-full items-start gap-3 border-b border-gray-100 bg-gold/10 p-4 text-left transition-colors hover:bg-gray-50"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px] bg-green-mid/10 text-green-mid">
                        <Icon size={20} weight="duotone" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-dm-sans text-[10px] font-bold uppercase tracking-wide text-green-mid">
                          {kindLabels[notification.kind]}
                        </p>
                        <h4 className="mt-0.5 font-dm-sans text-sm font-semibold text-green-deep">
                          {notification.title}
                        </h4>
                        {notification.detail && (
                          <p className="line-clamp-2 font-dm-sans text-xs text-text-mid">{notification.detail}</p>
                        )}
                        <p className="mt-1 font-dm-sans text-xs text-text-mid">{formatTime(notification.timestamp)}</p>
                      </div>
                      <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-gold" />
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
