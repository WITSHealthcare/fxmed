import { NextRequest, NextResponse } from 'next/server'
import { fail, logHr, recruitingContext, serverError } from '../shared'
import { retentionPreview, runRetention } from './rules'

// Candidate retention: preview and run (admin). Intended monthly; the HR
// Officer reviews the result in hr_retention_log.
export async function GET(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved
  if (!admin) return fail('Admin access required', 403)
  try {
    const [preview, log] = await Promise.all([retentionPreview(context.database), context.database.from('hr_retention_log').select('*').in('entity_type', ['hr_candidates', 'hr_applications', 'hr_documents', 'hr_credentials', 'hr_reference_checks', 'hr_offers']).order('run_at', { ascending: false }).limit(100)])
    if (log.error) throw log.error
    return NextResponse.json({ ...preview, log: log.data })
  } catch (error) { return serverError(error, 'loading retention', 'Failed to load candidate retention.') }
}

export async function POST(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved
  if (!admin) return fail('Admin access required', 403)
  try {
    const result = await runRetention(context.database, context.user.id)
    await logHr(context, { action: 'retention_run', entityType: 'hr_candidates', description: `Ran candidate retention: ${result.anonymised} anonymised, ${result.healthDocumentsDeleted} health documents deleted`, metadata: result })
    return NextResponse.json(result)
  } catch (error) { return serverError(error, 'running retention', 'Failed to run candidate retention.') }
}
