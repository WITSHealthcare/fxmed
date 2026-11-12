'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { canAccessTab, type AdminRole } from '@/lib/admin-auth'
import { hasEmrPermission, type EmrPermission } from '@/lib/emr-permissions'

// What the signed-in staff member may see and do in the EMR, so screens can
// hide what their role cannot use. The server routes enforce the same rules.

type EmrAccess = {
  can: (permission: EmrPermission) => boolean
  /** Scheduling uses the booking window from the Requests tab. */
  canSchedule: boolean
}

// Outside the EMR workspace (a preview, a test) nothing is hidden.
const EmrAccessContext = createContext<EmrAccess>({ can: () => true, canSchedule: true })

export function EmrAccessProvider({ role, children }: { role: AdminRole | null; children: ReactNode }) {
  const value = useMemo<EmrAccess>(() => ({
    can: permission => hasEmrPermission(role, permission),
    canSchedule: canAccessTab(role, 'requests'),
  }), [role])
  return <EmrAccessContext.Provider value={value}>{children}</EmrAccessContext.Provider>
}

export const useEmrAccess = () => useContext(EmrAccessContext)
