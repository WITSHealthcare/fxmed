'use client'

import Forms from '@/components/admin/Forms'
import { useAdminRole } from '@/components/admin/shell/AdminShell'

export default function Page() {
  return <Forms role={useAdminRole()} />
}
