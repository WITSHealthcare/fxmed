'use client'

import { useState } from 'react'
import Image from 'next/image'
import ContactModal from '@/components/ContactModal'

export default function Footer() {
  const [showContactModal, setShowContactModal] = useState(false)

  return (
    <>
      <footer className="bg-black text-cream py-12 px-[5%]">
        <div className="max-w-7xl mx-auto">
        {/* Logo Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Logo */}
          <div className="flex justify-center items-center">
            <Image
                src="/logo-trimmed.png"
                alt="FXMed"
                width={262}
                height={64}
                className="h-16 w-auto"
              />
          </div>
          
          {/* Programs Column */}
          <div className="lg:col-span-1">
            <h3 className="font-dm-sans font-semibold text-gold text-[1rem] mb-4">Programs</h3>
            <ul className="space-y-2">
              <li className="font-dm-sans text-cream/80 text-[0.9rem]">
                <a href="/programs/thyroid-recovery" className="hover:text-gold transition-colors">Thyroid Recovery</a>
              </li>
              <li className="font-dm-sans text-cream/80 text-[0.9rem]">
                <a href="/programs/hormone-balance" className="hover:text-gold transition-colors">Hormone Balance</a>
              </li>
              <li className="font-dm-sans text-cream/80 text-[0.9rem]">
                <a href="/programs/gut-repair" className="hover:text-gold transition-colors">Gut Repair</a>
              </li>
              <li className="font-dm-sans text-cream/80 text-[0.9rem]">
                <a href="/programs/adrenal-reset" className="hover:text-gold transition-colors">Adrenal Reset</a>
              </li>
              <li className="font-dm-sans text-cream/80 text-[0.9rem]">
                <a href="/programs/immune-support" className="hover:text-gold transition-colors">Immune Support</a>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="lg:col-span-1">
            <h3 className="font-dm-sans font-semibold text-gold text-[1rem] mb-4">Company</h3>
            <ul className="space-y-2">
              <li className="font-dm-sans text-cream/80 text-[0.9rem]">
                <a href="/#about" className="hover:text-gold transition-colors">About Us</a>
              </li>
              <li className="font-dm-sans text-cream/80 text-[0.9rem]">
                <a href="/services" className="hover:text-gold transition-colors">Services</a>
              </li>
              <li className="font-dm-sans text-cream/80 text-[0.9rem]">
                <a href="/blog" className="hover:text-gold transition-colors">Blog</a>
              </li>
              <li className="font-dm-sans text-cream/80 text-[0.9rem]">
                <a href="/ambassadors" className="hover:text-gold transition-colors">Ambassadors</a>
              </li>
              <li className="font-dm-sans text-cream/80 text-[0.9rem]">
                <a href="/careers" className="hover:text-gold transition-colors">Careers</a>
              </li>
              <li className="font-dm-sans text-cream/80 text-[0.9rem]">
                <button
                  onClick={() => setShowContactModal(true)}
                  className="hover:text-gold transition-colors"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="lg:col-span-1">
            <h3 className="font-dm-sans font-semibold text-gold text-[1rem] mb-4">Contact</h3>
            <ul className="space-y-2">
              <li className="font-dm-sans text-cream/80 text-[0.9rem]">
                <button
                  onClick={() => setShowContactModal(true)}
                  className="hover:text-gold transition-colors"
                >
                  Contact Us
                </button>
              </li>
              <li className="font-dm-sans text-cream/80 text-[0.9rem]">
                <span className="text-cream/60">6A Robin Road, Crown Estate, Sangotedo, Lagos, Nigeria</span>
                <br />
                <span className="text-cream/60">8118 Fry Road, Suite 1303, Cypress, Texas, USA</span>
              </li>
              <li className="font-dm-sans text-cream/80 text-[0.9rem]">
                <span className="text-gold">+234 907 703 1311</span>
                <span className="text-cream/60"> · </span>
                <span className="text-gold">+1 832 779 2347</span>
              </li>
              <li className="font-dm-sans text-cream/80 text-[0.9rem]">
                <span className="text-gold">fxmed@wellnesswits.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-cream/20 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Copyright */}
            <div className="text-center md:col-span-2 text-left">
              <p className="font-dm-sans text-cream/60 text-[0.85rem] text-left mb-4">
                © 2026 WITS Functional Medicine. All rights reserved.
              </p>
              <div className="flex items-center space-x-4">
                <span className="font-dm-sans text-cream/60 text-[0.85rem]">Follow us on</span>
                <a 
                  href="https://www.youtube.com/@witsfxmed" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cream/60 hover:text-gold transition-colors"
                  aria-label="Follow FXMed on YouTube"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <a 
                  href="https://www.instagram.com/fxmed.ng/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cream/60 hover:text-gold transition-colors"
                  aria-label="Follow FXMed on Instagram"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
        </div>
      </footer>

      {showContactModal && (
        <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
      )}
    </>
  )
}
