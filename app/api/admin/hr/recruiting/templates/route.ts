import { NextRequest, NextResponse } from 'next/server'
import { canHr, cleanHrEnum, cleanHrNumber, cleanHrText, cleanHrUuid, type RoleFamily } from '@/lib/hr'
import { defaultScorecardCompetencies, interviewLoops, type ScorecardCompetency } from '@/lib/hr-recruiting'
import { fail, logHr, readJson, recruitingContext, serverError } from '../shared'

// Scorecard templates per role family (settings: readable by every role,
// written by admin). Templates are versioned, not edited in place, so a
// submitted scorecard always reads against the anchors it was scored on.
const families: RoleFamily[] = ['A', 'B', 'C', 'D', 'E', 'F']
function cleanCompetencies(value: unknown, family: RoleFamily): ScorecardCompetency[] {
  const steps = interviewLoops[family].map((step) => step.code); const seen = new Set<string>()
  return (Array.isArray(value) ? value : []).slice(0, 30).flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const item = raw as Record<string, unknown>; const name = cleanHrText(item.name, 120)
    const code = (cleanHrText(item.code, 60) || name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60)
    if (!name || !code || seen.has(code)) return []
    seen.add(code)
    const anchors = Array.isArray(item.anchors) ? item.anchors.slice(0, 4).map((anchor) => cleanHrText(anchor, 300)) : []
    return [{ code, name, is_core: item.is_core === true, is_knockout: item.is_knockout === true, anchors: [0, 1, 2, 3].map((index) => anchors[index] || ''), loop_step_codes: Array.isArray(item.loop_step_codes) ? item.loop_step_codes.filter((step): step is string => typeof step === 'string' && steps.includes(step)) : [] }]
  })
}

export async function GET(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context } = resolved
  if (!canHr(context.viewer.role, 'settings', 'other')) return fail('HR access required', 403)
  try {
    const { data, error } = await context.database.from('hr_scorecard_templates').select('*').order('role_family').order('version', { ascending: false }); if (error) throw error
    return NextResponse.json({ templates: data })
  } catch (error) { return serverError(error, 'loading scorecard templates', 'Failed to load scorecard templates.') }
}

// { action: 'seed' } loads the FXMed defaults for families with no template;
// otherwise creates the next version for a family and makes it the active one.
export async function POST(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user } = context
  if (!admin) return fail('Admin access required', 403)
  const body = await readJson(request); if (!body) return fail('Invalid request.')
  try {
    const { data: existing, error } = await database.from('hr_scorecard_templates').select('role_family,version'); if (error) throw error
    if (body.action === 'seed') {
      const missing = families.filter((family) => !(existing || []).some((row) => row.role_family === family))
      if (!missing.length) return fail('Every role family already has a template.')
      const { error: insertError } = await database.from('hr_scorecard_templates').insert(missing.map((family) => ({ role_family: family, version: 1, competencies: defaultScorecardCompetencies(family), created_by: user.id }))); if (insertError) throw insertError
      await logHr(context, { action: 'create', entityType: 'hr_scorecard_template', description: `Loaded default scorecard templates for families ${missing.join(', ')}` })
      return NextResponse.json({ created: missing.length }, { status: 201 })
    }
    const family = cleanHrEnum(body.role_family, families); if (!family) return fail('Choose the role family.')
    const competencies = cleanCompetencies(body.competencies, family)
    if (competencies.length < 2 || competencies.some((item) => item.anchors.some((anchor) => !anchor))) return fail('Add at least two competencies, each with all four anchors.')
    const version = Math.max(0, ...(existing || []).filter((row) => row.role_family === family).map((row) => row.version)) + 1
    const { data, error: insertError } = await database.from('hr_scorecard_templates').insert({ role_family: family, version, competencies, min_average: cleanHrNumber(body.min_average, 1, 4) ?? 3, max_twos: Math.trunc(cleanHrNumber(body.max_twos, 0, 20) ?? 1), created_by: user.id }).select('*').single()
    if (insertError) throw insertError
    await database.from('hr_scorecard_templates').update({ active: false }).eq('role_family', family).neq('id', data.id)
    await logHr(context, { action: 'create', entityType: 'hr_scorecard_template', entityId: data.id, description: `Created scorecard template ${family} v${version}` })
    return NextResponse.json({ template: data }, { status: 201 })
  } catch (error) { return serverError(error, 'saving scorecard template', 'Failed to save the scorecard template.') }
}

// Activate a template version (one active version per family).
export async function PATCH(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database } = context
  if (!admin) return fail('Admin access required', 403)
  const body = await readJson(request); const id = cleanHrUuid(body?.id); if (!id) return fail('A valid template is required.')
  try {
    const { data: template } = await database.from('hr_scorecard_templates').select('id,role_family,version').eq('id', id).maybeSingle(); if (!template) return fail('Template not found.', 404)
    await database.from('hr_scorecard_templates').update({ active: false }).eq('role_family', template.role_family)
    const { error } = await database.from('hr_scorecard_templates').update({ active: true }).eq('id', id); if (error) throw error
    await logHr(context, { action: 'activate', entityType: 'hr_scorecard_template', entityId: id, description: `Activated scorecard template ${template.role_family} v${template.version}` })
    return NextResponse.json({ success: true })
  } catch (error) { return serverError(error, 'activating scorecard template', 'Failed to activate the template.') }
}
