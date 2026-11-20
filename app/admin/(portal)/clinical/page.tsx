'use client'

import EmrWorkspace from '@/components/admin/emr/EmrWorkspace'
import { useAdminRole } from '@/components/admin/shell/AdminShell'

export default function Page() {
  return <EmrWorkspace role={useAdminRole()} />
}
