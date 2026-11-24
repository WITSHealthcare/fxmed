import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import LabLibraryBrowser from '@/components/lab-library/LabLibraryBrowser'
import { absoluteUrl, createBreadcrumbJsonLd, createMetadata, siteUrl } from '@/lib/seo'
import { LAB_LIBRARY_PATH, libraryMarkers, libraryPanels, markerPath } from '@/lib/labLibrary'

export const metadata = createMetadata({
  title: 'Lab Library: What Your Blood Test Results Mean | FXMed',
  description: 'Plain-English guides to the blood tests FXMed reads in a Functional Health Analysis: what each marker measures, the lab and FXMed optimal ranges, and what high or low means.',
  path: LAB_LIBRARY_PATH,
  keywords: ['blood test results explained', 'lab test reference ranges', 'optimal ranges', 'functional health analysis', 'lab tests Lagos'],
})

// The library index: every marker in the Functional Health Analysis catalogue,
// grouped by panel, with search.
export default function LabLibraryPage() {
  const markers = libraryMarkers()
  const panels = libraryPanels().map(panel => ({ id: panel.id, name: panel.name }))
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'FXMed Lab Library',
    url: absoluteUrl(LAB_LIBRARY_PATH),
    isPartOf: { '@id': `${siteUrl}/#organization` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: markers.length,
      itemListElement: markers.map((marker, index) => ({ '@type': 'ListItem', position: index + 1, name: marker.name, url: absoluteUrl(markerPath(marker.id)) })),
    },
  }

  return <main className="min-h-screen bg-[#FCFFF0]">
    <JsonLd data={createBreadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Lab Library', path: LAB_LIBRARY_PATH }])} />
    <JsonLd data={jsonLd} />
    <Navigation />
    <section className="bg-gradient-to-br from-green-deep to-green-mid px-[5%] pb-14 pt-40 text-white">
      <div className="mx-auto max-w-6xl font-dm-sans">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold">FXMed Lab Library</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">What your blood test results are telling you</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-white/85">
          Every marker we read in a Functional Health Analysis, explained in plain English: what it measures, the range your laboratory prints, the narrower FXMed optimal range our clinicians work to, and what it can mean when a result runs high or low.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/functional-health-analysis" className="rounded-full bg-gold px-6 py-3 text-sm font-bold text-green-deep no-underline transition hover:-translate-y-0.5">Get your Functional Health Analysis</Link>
          <a href="#markers" className="rounded-full px-6 py-3 text-sm font-bold text-white no-underline ring-1 ring-white/40 transition hover:bg-white/10">Browse {markers.length} markers</a>
        </div>
      </div>
    </section>

    <section className="px-[5%] pt-10 font-dm-sans">
      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
        {[
          ['Two ranges, not one', 'Your laboratory\'s range shows where most people tested fall. The FXMed optimal range is the narrower band where we see the body working at its best.'],
          ['Read together, not alone', 'No single number tells the whole story. In your analysis each marker is read alongside the others that reflect the same body system.'],
          ['A guide, not a diagnosis', 'These pages explain what a result can mean. Your FXMed clinician reads your results with your history and symptoms before advising anything.'],
        ].map(([title, text]) => <div key={title} className="rounded-[20px] bg-white p-5 ring-1 ring-green-deep/10">
          <h2 className="text-base font-bold text-green-deep">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-text-mid">{text}</p>
        </div>)}
      </div>
    </section>

    <section id="markers" className="scroll-mt-24 px-[5%] pb-20 pt-6">
      <LabLibraryBrowser markers={markers} panels={panels} />
    </section>
    <Footer />
  </main>
}
