'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminRole } from '@/components/admin/shell/AdminShell'
import { Spinner } from '@/components/admin/ui'
import { defaultAdminPath } from '@/lib/admin-routes'

// /admin opens the main workspace for the signed-in role. (Old /admin?tab=
// links are redirected to their new address in proxy.ts before reaching here.)
export default function AdminIndex() {
  const role = useAdminRole()
  const router = useRouter()
  useEffect(() => { router.replace(defaultAdminPath(role)) }, [role, router])
  return <Spinner />
}
