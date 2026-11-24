export type ChipTone = 'flag' | 'watch' | 'clear' | 'nodata'

const styles: Record<ChipTone, string> = {
  flag: 'bg-[#f6dcd9] text-[#b8433b]',
  watch: 'bg-[#f6ebcd] text-[#8a6312]',
  clear: 'bg-[#e3ecd5] text-[#4f7a35]',
  nodata: 'bg-clinic-ink/[0.06] text-clinic-muted',
}
const labels: Record<ChipTone, string> = { flag: 'Flag', watch: 'Watch', clear: 'Clear', nodata: 'No data' }

/** A soft status pill: Flag, Watch, Clear or No data, as on the FxMed Twin. */
export default function StatusChip({ tone, children }: { tone: ChipTone; children?: React.ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium leading-none ${styles[tone]}`}>{children ?? labels[tone]}</span>
}
