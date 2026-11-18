import { NextRequest, NextResponse } from 'next/server'
import { getUserAdminRole } from '@/lib/admin-auth'
import { getRequestUser } from '@/lib/ambassador-portal'
import { portalUrl } from '@/lib/portal-url'
import { getTrainingDatabase } from '@/lib/training'
import { findCertificate, renderCertificatePdf } from '@/lib/trainingCertificatePdf'

type Context = { params: Promise<{ id: string }> }

// The certificate PDF, for the learner who earned it (staff or external) or an admin.
export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params
  const user = await getRequestUser(request); const database = getTrainingDatabase()
  if (!user) return NextResponse.json({ error: 'Sign in to download your certificate.' }, { status: 401 })
  if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  try {
    const certificate = await findCertificate(database, id)
    if (!certificate || (certificate.userId !== user.id && getUserAdminRole(user) !== 'admin')) return NextResponse.json({ error: 'Certificate not found.' }, { status: 404 })
    const pdf = await renderCertificatePdf(certificate, portalUrl(request, `/courses/certificates/${certificate.id}`))
    return new NextResponse(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="FXMed-certificate-${certificate.id}.pdf"`, 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Error creating certificate:', error)
    return NextResponse.json({ error: 'Could not create the certificate.' }, { status: 500 })
  }
}
