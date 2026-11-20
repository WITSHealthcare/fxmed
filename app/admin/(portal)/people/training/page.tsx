'use client'

import Training from '@/components/admin/Training'
import { useAdminRole } from '@/components/admin/shell/AdminShell'

export default function Page() {
  return <Training role={useAdminRole()} />
}
