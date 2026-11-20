import { hasEmrPermission, type EmrPermission } from '@/lib/emr-permissions'
import type { AdminRole } from '@/lib/admin-auth'

// The views of the clinical workspace (/admin/clinical?view=<id>), in the
// groups the sidebar shows them in. A view needs view_clinical_records unless
// it names another permission.
export type EmrView = 'dashboard' | 'outreaches' | 'follow_ups' | 'referrals' | 'health_analysis' | 'patients' | 'appointments' | 'encounters' | 'records' | 'investigations' | 'medications' | 'care_plans' | 'documents'

export const emrViewGroups: Array<{ label: string; views: Array<{ id: EmrView; label: string; permission?: EmrPermission }> }> = [
  {
    label: 'Today',
    views: [
      { id: 'dashboard', label: 'Overview' },
      { id: 'appointments', label: 'Appointments', permission: 'view_patients' },
      { id: 'encounters', label: 'Encounters' },
    ],
  },
  {
    label: 'Patients',
    views: [
      { id: 'patients', label: 'Patients', permission: 'view_patients' },
      { id: 'follow_ups', label: 'Follow-ups', permission: 'view_follow_ups' },
      { id: 'outreaches', label: 'Outreaches', permission: 'view_patients' },
      { id: 'referrals', label: 'Referrals' },
    ],
  },
  {
    label: 'Records',
    views: [
      { id: 'records', label: 'Clinical records' },
      { id: 'investigations', label: 'Investigations' },
      { id: 'medications', label: 'Medications' },
      { id: 'care_plans', label: 'Care plans' },
      { id: 'documents', label: 'Documents' },
      { id: 'health_analysis', label: 'Health analysis' },
    ],
  },
]

export const emrViews = emrViewGroups.flatMap((group) => group.views)

export function emrViewsForRole(role: AdminRole | null) {
  return emrViews.filter((view) => hasEmrPermission(role, view.permission || 'view_clinical_records'))
}

// The view /admin/clinical opens on when none is named.
export function defaultEmrView(role: AdminRole | null): EmrView {
  const views = emrViewsForRole(role).map((view) => view.id)
  // Lab staff start at their worklist.
  const preferred: EmrView[] = role === 'lab' ? ['investigations', 'dashboard'] : ['dashboard', 'appointments']
  return preferred.find((id) => views.includes(id)) || views[0] || 'dashboard'
}
