import type { NextRequest } from 'next/server'
import { cleanHrDate, cleanHrNumber, cleanHrOptionalText, cleanHrText } from '@/lib/hr'
import { denied, failure, invalid, isAdmin, json, log, performanceContext, readBody } from '../shared'

// Federal holidays on fixed dates (leave-policy.md section 8). Easter, the Eids
// and weekend substitutes are added as the Federal Government declares them.
const fixedHolidays: [string, string][] = [['01-01', "New Year's Day"], ['05-01', "Workers' Day"], ['06-12', 'Democracy Day'], ['10-01', 'Independence Day'], ['12-25', 'Christmas Day'], ['12-26', 'Boxing Day']]

export async function GET(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  try {
    const year = Math.round(cleanHrNumber(new URL(request.url).searchParams.get('year'), 2020, 2100) ?? Number(context.today.slice(0, 4)))
    const { data, error } = await context.database.from('hr_public_holidays').select('holiday_date,name,confirmed,source').gte('holiday_date', `${year}-01-01`).lte('holiday_date', `${year}-12-31`).order('holiday_date')
    if (error) throw error
    return json({ holidays: data || [], year })
  } catch (error) { return failure(error, 'Failed to load public holidays') }
}

// Add or update one holiday, or { seed: year } to add the fixed-date ones.
export async function POST(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  if (!isAdmin(context)) return denied('People Ops maintains the public holiday list.')
  try {
    const body = await readBody(request); if (!body) return invalid('A holiday is required.')
    const seed = cleanHrNumber(body.seed, 2020, 2100)
    const rows = seed ? fixedHolidays.map(([date, name]) => ({ holiday_date: `${Math.round(seed)}-${date}`, name, confirmed: true, source: 'Fixed federal holiday' }))
      : [{ holiday_date: cleanHrDate(body.holiday_date), name: cleanHrText(body.name, 160), confirmed: body.confirmed === true, source: cleanHrOptionalText(body.source, 300) }]
    if (rows.some((row) => !row.holiday_date || !row.name)) return invalid('Give the date and name of the holiday.')
    const { data, error } = await context.database.from('hr_public_holidays').upsert(rows, { onConflict: 'holiday_date', ignoreDuplicates: !!seed }).select('*')
    if (error) throw error
    await log(context, null, { action: seed ? 'seed_public_holidays' : 'save_public_holiday', description: seed ? `Added fixed ${seed} public holidays` : `Saved public holiday ${rows[0].name} (${rows[0].holiday_date})`, entityType: 'hr_public_holiday', entityId: seed ? String(seed) : rows[0].holiday_date })
    return json({ holidays: data || [] }, 201)
  } catch (error) { return failure(error, 'Failed to save the public holiday') }
}

export async function DELETE(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  if (!isAdmin(context)) return denied('People Ops maintains the public holiday list.')
  try {
    const date = cleanHrDate(new URL(request.url).searchParams.get('date')); if (!date) return invalid('A valid date is required.')
    const { error } = await context.database.from('hr_public_holidays').delete().eq('holiday_date', date); if (error) throw error
    await log(context, null, { action: 'delete_public_holiday', description: `Removed the public holiday on ${date}`, entityType: 'hr_public_holiday', entityId: date })
    return json({ success: true })
  } catch (error) { return failure(error, 'Failed to remove the public holiday') }
}
