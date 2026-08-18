'use client'

import { useMemo, useState } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { buildApplyLink, defaultCareersEmail, type CareerOpening } from '@/lib/careers'

const values = [
  {
    icon: '/Dna.svg',
    iconColor: '#2D6A4F',
    iconBackground: '#E6F0EB',
    title: 'Root-Cause Thinking',
    desc: 'We are not satisfied with managing symptoms. Every role here asks the same question our clinicians ask: why is this happening?',
  },
  {
    icon: '/Heartbeat.svg',
    iconColor: '#FF4C46',
    iconBackground: '#FFECEB',
    title: 'Patients Before Process',
    desc: 'Protocols exist to serve people, never the other way round. If a process is failing, we change the process.',
  },
  {
    icon: '/Plant.svg',
    iconColor: '#1C2B22',
    iconBackground: '#EAEDEB',
    title: 'Room to Grow',
    desc: 'Nobody here is bored. You will take on projects that are genuinely exciting and a little beyond you, and come out the other side better at what you do.',
  },
]

const steps = [
  { step: '01', title: 'Apply', desc: 'Send your CV and a short note about why this role fits you.' },
  { step: '02', title: 'Speak With Us', desc: 'One or two calls — with our team, and where it helps, with the people you would work alongside.' },
  { step: '03', title: 'Offer', desc: 'We send the offer and agree a start date that works for both of us.' },
]

export default function CareersContent({ openings }: { openings: CareerOpening[] }) {
  const [department, setDepartment] = useState('All')
  const [expanded, setExpanded] = useState<string | null>(null)

  // Only offer filters for departments that actually have an opening.
  const departments = useMemo(
    () => ['All', ...Array.from(new Set(openings.map((role) => role.department)))],
    [openings],
  )

  const filtered = department === 'All' ? openings : openings.filter((role) => role.department === department)

  return (
    <main className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-green-deep to-green-mid text-white pt-52 pb-20 px-[5%] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat brightness-[0.4]"
          style={{ backgroundImage: "url('/Equipment.jpg')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(15,36,25,0.3)] via-[rgba(15,36,25,0.7)] to-[rgba(15,36,25,0.97)]"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-block text-gold bg-gold/20 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-6">
            Careers at FXMed
          </div>
          <h1 className="font-dm-sans font-bold text-[clamp(2.5rem,5vw,4rem)] leading-[1.15] mb-6">
            Help Us Treat Causes,<br/>Not Symptoms
          </h1>
          <p className="font-dm-sans text-cream/80 text-[1.2rem] leading-[1.7] max-w-2xl mx-auto mb-8">
            We are building functional medicine care that actually reaches people — across Lagos, Texas and
            everywhere our patients live. If that work matters to you, we would like to meet you.
          </p>
          <Link
            href="#openings"
            className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] no-underline transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] inline-block"
          >
            View Open Roles →
          </Link>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#FCFFF0] py-[80px] px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,2.5rem)] leading-[1.15] mb-4">
              What It Is Like to Work Here
            </h2>
            <p className="font-dm-sans text-text-mid text-[1.05rem] leading-[1.7] max-w-2xl mx-auto">
              A small, senior team that moves quickly and takes patient outcomes personally
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value) => (
              <div key={value.title} className="bg-white rounded-[20px] p-8 shadow-custom transition-all hover:shadow-custom-hover hover:transform hover:translate-y-[-4px]">
                <div className="w-14 h-14 rounded-[16px] flex items-center justify-center mb-5" style={{ backgroundColor: value.iconBackground }}>
                  <span
                    aria-hidden="true"
                    className="h-[30px] w-[30px]"
                    style={{
                      backgroundColor: value.iconColor,
                      WebkitMaskImage: `url(${value.icon})`,
                      maskImage: `url(${value.icon})`,
                      WebkitMaskPosition: 'center',
                      maskPosition: 'center',
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                    }}
                  />
                </div>
                <h3 className="font-dm-sans font-semibold text-green-deep text-[1.2rem] mb-3">{value.title}</h3>
                <p className="font-dm-sans text-text-mid text-[0.95rem] leading-[1.6]">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Roles */}
      <section id="openings" className="bg-white py-[90px] px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-4">
              Open Positions
            </div>
            <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
              Current Openings
            </h2>
            <p className="font-dm-sans text-text-mid text-[1.05rem] leading-[1.7] max-w-2xl mx-auto">
              {openings.length
                ? `${openings.length} role${openings.length === 1 ? '' : 's'} open across our teams`
                : 'We have no advertised roles right now — open applications are always welcome'}
            </p>
          </div>

          {openings.length > 0 && (
            <>
              {/* Department filter */}
              {departments.length > 2 && (
                <div className="flex flex-wrap justify-center gap-3 mb-12">
                  {departments.map((item) => (
                    <button
                      key={item}
                      onClick={() => setDepartment(item)}
                      className={`font-dm-sans px-5 py-2.5 rounded-[30px] text-[0.9rem] font-semibold transition-all ${
                        department === item
                          ? 'bg-green-deep text-cream'
                          : 'bg-green-deep/5 text-text-mid hover:bg-green-deep/10'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-5">
                {filtered.map((role) => {
                  const isOpen = expanded === role.id
                  return (
                    <div key={role.id} className="border border-green-deep/10 rounded-[20px] overflow-hidden transition-all hover:border-green-deep/25">
                      <button
                        onClick={() => setExpanded(isOpen ? null : role.id)}
                        aria-expanded={isOpen}
                        aria-controls={`role-detail-${role.id}`}
                        className="w-full text-left p-7 flex flex-wrap items-start justify-between gap-4"
                      >
                        <div className="flex-1 min-w-[260px]">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h3 className="font-dm-sans font-bold text-green-deep text-[1.35rem]">{role.title}</h3>
                            <span className="font-dm-sans text-green-mid bg-green-mid/10 px-3 py-1 rounded-[20px] text-[0.72rem] font-semibold uppercase tracking-[0.1em]">
                              {role.department}
                            </span>
                          </div>
                          <p className="font-dm-sans text-text-mid text-[0.95rem] leading-[1.6] mb-3">{role.summary}</p>
                          <div className="font-dm-sans text-text-mid/70 text-[0.85rem]">
                            {role.location} <span className="mx-2">·</span> {role.employment_type}
                          </div>
                        </div>
                        <span className="font-dm-sans text-green-mid text-[0.9rem] font-semibold whitespace-nowrap">
                          {isOpen ? 'Hide details −' : 'View details +'}
                        </span>
                      </button>

                      <div
                        id={`role-detail-${role.id}`}
                        hidden={!isOpen}
                        className="px-7 pb-7 border-t border-green-deep/10 pt-6"
                      >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {role.responsibilities?.length > 0 && (
                              <div>
                                <h4 className="font-dm-sans font-semibold text-green-deep text-[1.05rem] mb-4">What You Will Do</h4>
                                <ul className="space-y-2.5">
                                  {role.responsibilities.map((item) => (
                                    <li key={item} className="flex items-start gap-3">
                                      <span className="text-gold mt-0.5">✓</span>
                                      <span className="font-dm-sans text-text-mid text-[0.9rem] leading-[1.6]">{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {role.requirements?.length > 0 && (
                              <div>
                                <h4 className="font-dm-sans font-semibold text-green-deep text-[1.05rem] mb-4">What We Are Looking For</h4>
                                <ul className="space-y-2.5">
                                  {role.requirements.map((item) => (
                                    <li key={item} className="flex items-start gap-3">
                                      <span className="text-gold mt-0.5">✓</span>
                                      <span className="font-dm-sans text-text-mid text-[0.9rem] leading-[1.6]">{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <a
                            href={buildApplyLink(role.title, role.apply_email)}
                            className="font-dm-sans bg-green-deep text-cream px-6 py-3 rounded-[30px] font-semibold text-[0.95rem] no-underline transition-all hover:bg-green-mid inline-block mt-7"
                          >
                          Apply for this role →
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {openings.length > 0 && !filtered.length && (
            <div className="text-center py-16">
              <p className="font-dm-sans text-text-mid text-[1rem]">
                No openings in this team right now. We would still like to hear from you.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Hiring Process */}
      <section className="bg-[#FCFFF0] py-[90px] px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,2.5rem)] leading-[1.15] mb-4">
              Our Hiring Process
            </h2>
            <p className="font-dm-sans text-text-mid text-[1.05rem] leading-[1.7] max-w-2xl mx-auto">
              Three steps and no endless interview rounds
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((item) => (
              <div key={item.step} className="bg-gradient-to-br from-green-deep/5 to-gold/5 rounded-[20px] p-7">
                <div className="font-dm-sans font-bold text-gold text-[2rem] mb-3">{item.step}</div>
                <h3 className="font-dm-sans font-semibold text-green-deep text-[1.1rem] mb-2">{item.title}</h3>
                <p className="font-dm-sans text-text-mid text-[0.9rem] leading-[1.6]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Application CTA */}
      <section className="bg-gradient-to-br from-green-deep to-green-mid text-white py-[90px] px-[5%]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-dm-sans font-bold text-[clamp(2rem,4vw,2.5rem)] leading-[1.15] mb-5">
            Do Not See Your Role?
          </h2>
          <p className="font-dm-sans text-cream/80 text-[1.1rem] leading-[1.7] mb-8">
            We are always glad to hear from exceptional clinicians, operators and builders. Send us your CV and
            tell us how you would like to contribute — we keep every application on file.
          </p>
          <a
            href={`mailto:${defaultCareersEmail}?subject=${encodeURIComponent('Open Application')}`}
            className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] no-underline transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] inline-block"
          >
            Send an Open Application →
          </a>
          <p className="font-dm-sans text-cream/60 text-[0.9rem] mt-6">
            Or email us directly at <span className="text-gold">{defaultCareersEmail}</span>
          </p>
        </div>
      </section>

      <Footer />
    </main>
  )
}
