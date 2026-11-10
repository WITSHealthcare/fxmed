'use client'

import { useState } from 'react'
import Image from 'next/image'

const videoId = 'EciXbeQd9So'

export default function VideoSection() {
  const [playing, setPlaying] = useState(false)
  return (
    <section id="video-section" className="bg-green-deep py-[90px] px-[5%]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-block text-gold bg-gold/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-4">
            Watch & Learn
          </div>
          
          {/* Heading */}
          <h2 className="font-dm-sans font-bold text-white text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
            Patient education<br/>you can actually use
          </h2>
          
          {/* Description */}
          <p className="font-dm-sans text-cream/80 text-[1.05rem] leading-[1.7] max-w-[600px] mx-auto">
            Real conversations, expert insights, and practical guidance from the FXMed team.
          </p>
          
          {/* The YouTube player and its code load only when someone presses play. */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="relative rounded-[20px] overflow-hidden shadow-2xl bg-black/20 aspect-video">
              {playing ? (
                <iframe
                  className="w-full h-full rounded-[20px]"
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                  title="FXMed Featured Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  aria-label="Play the FXMed featured video"
                  className="group absolute inset-0 h-full w-full cursor-pointer focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-gold"
                >
                  <Image src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" fill sizes="(min-width: 896px) 896px, 100vw" className="object-cover" />
                  <span className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/10" />
                  <span className="absolute left-1/2 top-1/2 flex h-16 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-[#ff0000] shadow-lg transition-transform group-hover:scale-105">
                    <svg viewBox="0 0 24 24" width="34" height="34" fill="#fff" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" /></svg>
                  </span>
                </button>
              )}
            </div>
          </div>
          
          {/* CTA Button */}
          <div className="mt-8">
            <a 
              href="https://www.youtube.com/@witsfxmed" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] no-underline transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg inline-block"
            >
              View All Videos on YouTube →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
