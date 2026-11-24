import { clinic } from './shared'

export type MiniBar = { value: number; tone?: 'clear' | 'watch' | 'flag'; label?: string }

const fill = { clear: clinic.sage, watch: clinic.watch, flag: clinic.flag }

/**
 * A row of slim rounded bars, each on a pale track, as on the FxMed Twin's
 * check-in tiles. value runs 0 to 1. Decorative: give the figure it belongs
 * to its own text.
 */
export default function MiniBars({ bars, height = 30, max = 18 }: { bars: MiniBar[]; height?: number; max?: number }) {
  const shown = bars.slice(0, max)
  return <div className="flex items-end gap-[3px]" style={{ height }} aria-hidden="true">
    {shown.map((bar, index) => <span key={index} title={bar.label} className="relative block h-full w-[5px] shrink-0 rounded-full bg-clinic-ink/[0.07]">
      <span className="chart-grow-y absolute inset-x-0 bottom-0 block rounded-full" style={{ height: `${Math.max(18, Math.min(1, bar.value) * 100)}%`, background: fill[bar.tone || 'clear'], animationDelay: `${index * 25}ms` }} />
    </span>)}
  </div>
}
