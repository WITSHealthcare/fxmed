import type { ChecklistOwner, HrEmployee, HrRelation } from '@/lib/hr'
import type { HrCredentialView, HrDocument, HrEmployeeFile, HrOnboardingItem, HrPayrollProfile } from '@/lib/hr-people'

// Response shapes from /api/admin/hr/people.
export type FileDocument = Omit<HrDocument, 'storage_path'> & { can_open: boolean }
export type FileDetail = {
  employee: HrEmployeeFile; relation: HrRelation; payroll: HrPayrollProfile | null; documents: FileDocument[] | null; credentials: HrCredentialView[] | null; onboarding: HrOnboardingItem[] | null
  people: Record<string, string>; can: { editFile: boolean; uploadDocument: boolean; submitCredential: boolean; tickOnboarding: 'all' | Extract<ChecklistOwner, 'employee' | 'manager'> | null }
}
export type Progress = Record<string, { total: number; done: number }>
export type AdminList = { role: 'admin'; employees: (HrEmployee & { work_pattern: string | null; legal_hold: boolean })[]; onboarding: Progress; alerts: HrCredentialView[]; dataRequests: { open: number; overdue: number } }
export type StaffList = { role: 'clinical' | 'sales'; self: HrEmployee | null; reports: HrEmployee[]; onboarding: Progress; alerts: HrCredentialView[] }
