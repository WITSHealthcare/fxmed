'use client'

import HrWorkspace from '@/components/admin/hr/HrWorkspace'
import { useAdminRole } from '@/components/admin/shell/AdminShell'

export default function Page() {
  return <HrWorkspace role={useAdminRole()} />
}
