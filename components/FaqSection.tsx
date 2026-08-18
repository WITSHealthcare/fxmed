'use client'

import { useState } from 'react'

export type FaqItem = { question: string; answer: string }

// Renders an accessible FAQ accordion and emits matching FAQPage structured
// data. The JSON-LD must mirror the visible copy exactly — schema describing
// answers a visitor cannot see on the page is a structured-data violation.
export default function FaqSection({
  items,
  title = 'Frequently Asked Questions',
  subtitle,
  background = 'bg-[#FCFFF0]',
}: {
  items: FaqItem[]
  title?: string
  subtitle?: string
  background?: string
}) {
  const [open, setOpen] = useState<number | null>(0)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }

  return (
    <section className={`${background} py-[90px] px-[5%]`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,2.5rem)] leading-[1.15] mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="font-dm-sans text-text-mid text-[1.05rem] leading-[1.7] max-w-2xl mx-auto">{subtitle}</p>
          )}
        </div>

        <div className="space-y-4">
          {items.map((item, index) => {
            const isOpen = open === index
            return (
              <div key={item.question} className="rounded-[18px] border border-green-deep/10 bg-white overflow-hidden">
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${index}`}
                    id={`faq-question-${index}`}
                    className="w-full flex items-start justify-between gap-5 p-6 text-left"
                  >
                    <span className="font-dm-sans font-semibold text-green-deep text-[1.05rem] leading-[1.5]">
                      {item.question}
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-green-mid text-[1.4rem] leading-none mt-0.5">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-answer-${index}`}
                  role="region"
                  aria-labelledby={`faq-question-${index}`}
                  hidden={!isOpen}
                  className="px-6 pb-6"
                >
                  <p className="font-dm-sans text-text-mid text-[0.97rem] leading-[1.75]">{item.answer}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
