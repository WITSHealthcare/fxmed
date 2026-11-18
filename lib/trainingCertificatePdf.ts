import { readFile } from 'fs/promises'
import path from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'

// Course completion certificates: a branded A4 landscape PDF drawn on the
// server with jsPDF, and the lookup shared by the download and verify pages.

export type CertificateDetails = { id: string; name: string; course: string; completedAt: string; programId: string; userId: string }

const GREEN = [26, 61, 46] as const
const MID = [45, 106, 79] as const
const GOLD = [201, 226, 101] as const

export async function findCertificate(database: SupabaseClient, certificateId: string): Promise<CertificateDetails | null> {
  if (!/^FXM-[0-9A-F]{12}$/.test(certificateId)) return null
  const { data: enrolment, error } = await database.from('training_enrolments')
    .select('certificate_id,completed_at,user_id,program_id,status,program:training_programs(title,certificate_enabled)')
    .eq('certificate_id', certificateId).maybeSingle()
  if (error) throw error
  const program = (Array.isArray(enrolment?.program) ? enrolment?.program[0] : enrolment?.program) as { title: string } | undefined
  if (!enrolment || !program || !enrolment.completed_at || enrolment.status === 'revoked') return null
  const [{ data: account }, { data: userResult }] = await Promise.all([
    database.from('training_learner_accounts').select('full_name').eq('user_id', enrolment.user_id).maybeSingle(),
    database.auth.admin.getUserById(enrolment.user_id),
  ])
  const meta = userResult.user?.user_metadata || {}
  const name = account?.full_name || meta.full_name || [meta.first_name, meta.last_name].filter(Boolean).join(' ') || userResult.user?.email || 'Learner'
  return { id: certificateId, name, course: program.title, completedAt: enrolment.completed_at, programId: enrolment.program_id, userId: enrolment.user_id }
}

export async function renderCertificatePdf(details: CertificateDetails, verifyUrl: string) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  const width = doc.internal.pageSize.getWidth(); const height = doc.internal.pageSize.getHeight()

  doc.setFillColor(252, 255, 240); doc.rect(0, 0, width, height, 'F')
  doc.setDrawColor(...GREEN); doc.setLineWidth(1.6); doc.rect(10, 10, width - 20, height - 20)
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.6); doc.rect(14, 14, width - 28, height - 28)
  doc.setFillColor(...GREEN); doc.rect(14, 14, width - 28, 10, 'F')

  try {
    const logo = await readFile(path.join(process.cwd(), 'public', 'FXMed_Logo_Black.png'))
    doc.addImage(`data:image/png;base64,${logo.toString('base64')}`, 'PNG', width / 2 - 30, 32, 60, 16.7, undefined, 'FAST')
  } catch { /* the certificate still reads correctly without the logo */ }

  const centre = (text: string, y: number, size: number, style: 'normal' | 'bold' | 'italic', color: readonly [number, number, number]) => {
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color); doc.text(text, width / 2, y, { align: 'center', maxWidth: width - 60 })
  }
  centre('CERTIFICATE OF COMPLETION', 66, 13, 'bold', MID)
  centre('This certifies that', 82, 12, 'italic', [74, 94, 82])
  centre(details.name, 100, 30, 'bold', GREEN)
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.8); doc.line(width / 2 - 70, 106, width / 2 + 70, 106)
  centre('has successfully completed the course', 118, 12, 'italic', [74, 94, 82])
  centre(details.course, 133, 20, 'bold', GREEN)

  const date = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(details.completedAt))
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(74, 94, 82)
  doc.text(`Completed ${date}`, 34, height - 34)
  doc.text(`Certificate ${details.id}`, width - 34, height - 34, { align: 'right' })
  doc.setFontSize(8); doc.text(`Verify at ${verifyUrl}`, width / 2, height - 24, { align: 'center' })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...GREEN)
  doc.text('FXMed', width / 2, height - 34, { align: 'center' })

  return Buffer.from(doc.output('arraybuffer'))
}
