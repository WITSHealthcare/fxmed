import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { absoluteUrl, createBreadcrumbJsonLd, createMetadata, siteUrl } from '@/lib/seo'
import { panelById, FM_BIOMARKERS } from '@/lib/fmBiomarkers'
import { MARKER_INFO } from '@/lib/fmMarkerInfo'
import {
  AREA_GROUP_TITLE, LAB_LIBRARY_PATH, areaUses, calculatedFrom, markerBySlug, markerPath, markerSlug,
  displayAliases, otherUnits, rangeRows, rangeText, relatedMarkers, shortAbout, unitSuffix, type AreaUse,
} from '@/lib/labLibrary'

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return FM_BIOMARKERS.map(marker => ({ slug: markerSlug(marker.id) }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const marker = markerBySlug(slug)
  if (!marker) return createMetadata({ title: 'Marker Not Found | FXMed', description: 'This marker is not in the FXMed Lab Library.', path: LAB_LIBRARY_PATH, noIndex: true })
  return createMetadata({
    title: `${marker.name}: Normal and Optimal Range, High and Low Results | FXMed`,
    description: `${marker.name} explained: what it measures, the laboratory and FXMed optimal ranges (${marker.unit}), and what high or low results can mean.`.slice(0, 160),
    path: markerPath(marker.id),
    keywords: [marker.name, ...(marker.aliases || []).slice(0, 4), `${marker.name} normal range`, `${marker.name} optimal range`, 'blood test Lagos'],
  })
}

const DIRECTION: Record<AreaUse['direction'], string> = { high: 'when high', low: 'when low', any: 'when high or low' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-[24px] bg-white p-6 ring-1 ring-green-deep/10 md:p-8">
    <h2 className="text-2xl font-bold text-green-deep">{title}</h2>
    <div className="mt-4 text-[15px] leading-7 text-text-mid">{children}</div>
  </section>
}

// One marker: what it measures, its ranges, what high and low can mean, and
// where it counts in a Functional Health Analysis.
export default async function LabMarkerPage({ params }: Props) {
  const { slug } = await params
  const marker = markerBySlug(slug)
  if (!marker) notFound()
  const info = MARKER_INFO[marker.id] || { about: '' }
  const panel = panelById(marker.panel)
  const aliases = displayAliases(marker)
  const unit = unitSuffix(marker.unit)
  const rows = rangeRows(marker)
  const units = otherUnits(marker)
  const inputs = calculatedFrom(marker.id)
  const uses = areaUses(marker.id)
  const systems = uses.filter(use => use.group !== 'plan')
  const focus = uses.filter(use => use.group === 'plan')
  const related = relatedMarkers(marker)
  const path = markerPath(marker.id)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: `${marker.name} | FXMed Lab Library`,
    description: shortAbout(marker.id),
    url: absoluteUrl(path),
    isPartOf: { '@id': `${siteUrl}/#organization` },
    provider: { '@id': `${siteUrl}/#organization` },
    medicalAudience: { '@type': 'MedicalAudience', audienceType: 'Patient' },
    about: { '@type': 'MedicalTest', name: marker.name, ...(aliases.length ? { alternateName: aliases } : {}) },
  }

  return <main className="min-h-screen bg-[#FCFFF0]">
    <JsonLd data={createBreadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Lab Library', path: LAB_LIBRARY_PATH }, { name: marker.name, path }])} />
    <JsonLd data={jsonLd} />
    <Navigation />
    <section className="bg-gradient-to-br from-green-deep to-green-mid px-[5%] pb-12 pt-40 text-white">
      <div className="mx-auto max-w-4xl font-dm-sans">
        <Link href={LAB_LIBRARY_PATH} className="text-sm font-bold text-gold no-underline hover:underline">← Lab Library</Link>
        <p className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-white/70">{panel.name}</p>
        <h1 className="mt-2 text-4xl font-bold leading-tight md:text-5xl">{marker.name}</h1>
        {!!aliases.length && <p className="mt-3 text-sm text-white/75">Also reported as: {aliases.join(', ')}</p>}
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/90">{info.about}</p>
      </div>
    </section>

    <div className="mx-auto max-w-4xl space-y-6 px-[5%] py-10 font-dm-sans md:px-0">
      <Section title="Ranges">
        <p>Your laboratory prints its own reference range. The FXMed optimal range is the narrower band our clinicians aim for. Ranges are for adults{unit ? `, in ${marker.unit}` : ''}; children are read against age-appropriate ranges instead.</p>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm">
          <thead><tr className="border-b border-green-deep/15 text-xs uppercase tracking-wide text-green-deep"><th className="py-2 pr-4"></th><th className="py-2 pr-4">Laboratory range</th><th className="py-2">FXMed optimal</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.who} className="border-b border-green-deep/5">
            <td className="py-3 pr-4 font-semibold text-green-deep">{row.who}</td>
            <td className="py-3 pr-4">{rangeText(row.lab)}{unit}</td>
            <td className="py-3 font-bold text-green-mid">{marker.fmFromLab ? 'Your laboratory\'s own cut-off' : `${rangeText(row.fm)}${unit}`}</td>
          </tr>)}</tbody>
        </table></div>
        {marker.fmFromLab && <p className="mt-3 text-sm">Cut-offs for this test differ between laboratories, so we read it against the one your laboratory uses.</p>}
        {units.map(item => <p key={item.unit} className="mt-3 text-sm">In {item.unit}: {item.rows.map(row => `${rows.length > 1 ? `${row.who.toLowerCase()} ` : ''}laboratory ${row.lab}, optimal ${row.fm}`).join('; ')}.</p>)}
        {(marker.critical?.low !== undefined || marker.critical?.high !== undefined) && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900">
          <strong>See a doctor promptly</strong> if your result is {[marker.critical.low !== undefined ? `below ${marker.critical.low}` : '', marker.critical.high !== undefined ? `above ${marker.critical.high}` : ''].filter(Boolean).join(' or ')}{unit}.
        </p>}
        {!!inputs.length && <p className="mt-4 text-sm">This is a calculated marker, worked out from {inputs.map((input, index) => <span key={input.id}>{index ? (index === inputs.length - 1 ? ' and ' : ', ') : ''}<Link href={markerPath(input.id)} className="font-semibold text-green-mid">{input.name}</Link></span>)}. If your laboratory does not report it, we calculate it for you.</p>}
      </Section>

      {(info.high || info.low) && <div className="grid gap-6 md:grid-cols-2">
        {info.high && <Section title="When it runs high"><p>{info.high}</p></Section>}
        {info.low && <Section title="When it runs low"><p>{info.low}</p></Section>}
      </div>}

      {!!uses.length && <Section title="Where it counts in your Functional Health Analysis">
        <p>We never judge {marker.name} on its own. In your Functional Health Analysis it feeds into the support scores for:</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">{systems.map(use => <li key={use.name} className="rounded-2xl bg-[#F4F8EC] px-4 py-3">
          <span className="font-semibold text-green-deep">{use.name}</span>
          <span className="block text-xs text-text-mid">{AREA_GROUP_TITLE(use.group)} · counts {DIRECTION[use.direction]}{use.key ? ' · key marker' : ''}</span>
        </li>)}</ul>
        {!!focus.length && <p className="mt-4">When it is off target alongside related markers, it can bring these into your care plan: <span className="font-semibold text-green-deep">{focus.map(use => use.name).join(', ')}</span>.</p>}
      </Section>}

      <section className="rounded-[24px] bg-green-deep p-6 text-white md:p-8">
        <h2 className="text-2xl font-bold">Want to know what your {marker.name} means for you?</h2>
        <p className="mt-3 max-w-2xl leading-7 text-white/85">A Functional Health Analysis reads all your results together, against both ranges, and turns them into a care plan you go through with an FXMed clinician.</p>
        <Link href="/functional-health-analysis" className="mt-5 inline-block rounded-full bg-gold px-6 py-3 text-sm font-bold text-green-deep no-underline transition hover:-translate-y-0.5">Get your Functional Health Analysis</Link>
      </section>

      {!!related.length && <section>
        <h2 className="text-xl font-bold text-green-deep">Related markers</h2>
        <div className="mt-3 flex flex-wrap gap-2">{related.map(item => <Link key={item.id} href={markerPath(item.id)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-green-deep no-underline ring-1 ring-green-deep/15 transition hover:ring-green-mid/50">{item.name}</Link>)}</div>
      </section>}

      <p className="text-xs leading-6 text-text-mid">This page is general health information from WITS FxMed Nigeria. It is not a diagnosis and does not replace a consultation. Do not start, stop or change any treatment because of it; speak to your clinician. In an emergency, go to the nearest hospital emergency department.</p>
    </div>
    <Footer />
  </main>
}
