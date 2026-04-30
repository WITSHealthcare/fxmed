'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AppointmentModal from '@/components/AppointmentModal'
import ContactModal from '@/components/ContactModal'

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [servicesDropdown, setServicesDropdown] = useState(false)
  const [assessmentDropdown, setAssessmentDropdown] = useState(false)
  const [programsDropdown, setProgramsDropdown] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isBlogPage = pathname?.startsWith('/blog')
const isHealthAssessmentPage = pathname === '/health-assessment'
const isFunctionalHealthPage = pathname?.startsWith('/functional-health-analysis')
const isElitePage = pathname === '/elite'
const isHomePage = pathname === '/'

  // Helper function to check if a link is active
  const isActiveLink = (href: string) => {
    if (href.startsWith('/#')) {
      return isHomePage
    }
    if (href === '/blog') {
      return isBlogPage
    }
    if (href === '/functional-health-analysis') {
      return isFunctionalHealthPage
    }
    if (href === '/health-assessment') {
      return isHealthAssessmentPage
    }
    if (href === '/elite') {
      return isElitePage
    }
    if (href.startsWith('/programs')) {
      return pathname?.startsWith('/programs')
    }
    return false
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
    setServicesDropdown(false)
    setAssessmentDropdown(false)
    setProgramsDropdown(false)
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-container')) {
        setServicesDropdown(false)
        setAssessmentDropdown(false)
        setProgramsDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled || isHealthAssessmentPage || isFunctionalHealthPage
          ? 'bg-green-deep/95 backdrop-blur-md border-b border-gold/20' 
          : 'bg-transparent'
      }`}>
        <div className="flex items-center justify-between px-[5%] py-[18px]">
          <a href="/" className="flex items-center no-underline">
            <img 
              src="/logo.png" 
              alt="FXMed" 
              className="h-[120px] w-auto md:h-[120px] h-[80px]"
            />
          </a>
          
          {/* Desktop Navigation */}
          <ul className="hidden lg:flex gap-4 list-none m-0 font-dm-sans items-center">
            {/* Programs Dropdown */}
            <li className="dropdown-container relative">
              <button 
                onClick={() => setProgramsDropdown(!programsDropdown)}
                className={`text-[0.8rem] font-medium transition-colors hover:text-gold flex items-center gap-1 ${
                  (isBlogPage && !isScrolled) ? 'text-black' : 'text-cream/85'
                } ${pathname?.startsWith('/programs') ? 'text-gold font-semibold' : ''}`}
              >
                Programs
                <svg className={`w-3 h-3 transition-transform ${programsDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {programsDropdown && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-green-deep/10 py-2 z-50">
                  <a href="/programs" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-deep/10 hover:text-green-deep no-underline">All Programs</a>
                  <a href="/programs/adrenal-reset" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-deep/10 hover:text-green-deep no-underline">Adrenal Reset</a>
                  <a href="/programs/gut-repair" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-deep/10 hover:text-green-deep no-underline">Gut Repair</a>
                  <a href="/programs/hormone-balance" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-deep/10 hover:text-green-deep no-underline">Hormone Balance</a>
                  <a href="/programs/thyroid-recovery" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-deep/10 hover:text-green-deep no-underline">Thyroid Recovery</a>
                  <a href="/programs/immune-support" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-deep/10 hover:text-green-deep no-underline">Immune Support</a>
                </div>
              )}
            </li>
            
            {/* Services Dropdown */}
            <li className="dropdown-container relative">
              <button 
                onClick={() => setServicesDropdown(!servicesDropdown)}
                className={`text-[0.8rem] font-medium transition-colors hover:text-gold flex items-center gap-1 ${
                  (isBlogPage && !isScrolled) ? 'text-black' : 'text-cream/85'
                } ${(isActiveLink('/#services') || isActiveLink('/#pricing')) ? 'text-gold font-semibold' : ''}`}
              >
                Services
                <svg className={`w-3 h-3 transition-transform ${servicesDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {servicesDropdown && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-green-deep/10 py-2 z-50">
                  <a href="/#services" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-deep/10 hover:text-green-deep no-underline">Our Services</a>
                  <a href="/#pricing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-deep/10 hover:text-green-deep no-underline">Pricing</a>
                  <a href="/elite" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-deep/10 hover:text-green-deep no-underline">FXMed Elite</a>
                </div>
              )}
            </li>
            
            {/* Assessment Dropdown */}
            <li className="dropdown-container relative">
              <button 
                onClick={() => setAssessmentDropdown(!assessmentDropdown)}
                className={`text-[0.8rem] font-medium transition-colors hover:text-gold flex items-center gap-1 ${
                  (isBlogPage && !isScrolled) ? 'text-black' : 'text-cream/85'
                } ${(isActiveLink('/functional-health-analysis') || isActiveLink('/health-assessment')) ? 'text-gold font-semibold' : ''}`}
              >
                Assessment
                <svg className={`w-3 h-3 transition-transform ${assessmentDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {assessmentDropdown && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-green-deep/10 py-2 z-50">
                  <a href="/functional-health-analysis" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-deep/10 hover:text-green-deep no-underline">Health Analysis</a>
                  <a href="/health-assessment" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-deep/10 hover:text-green-deep no-underline">Quick Assessment</a>
                </div>
              )}
            </li>
            
            <li><button onClick={() => setShowContactModal(true)} className={`text-[0.8rem] font-medium transition-colors hover:text-gold ${
              (isBlogPage && !isScrolled) ? 'text-black' : 'text-cream/85'
            }`}>Contact</button></li>
            <li><a href="/blog" className={`text-[0.8rem] font-medium no-underline transition-colors hover:text-gold ${
              (isBlogPage && !isScrolled) ? 'text-black' : 'text-cream/85'
            } ${isActiveLink('/blog') ? 'text-gold font-semibold' : ''}`}>Blog</a></li>
            <li><a href="/#about" className={`text-[0.8rem] font-medium no-underline transition-colors hover:text-gold ${
              (isBlogPage && !isScrolled) ? 'text-black' : 'text-cream/85'
            } ${isActiveLink('/#about') ? 'text-gold font-semibold' : ''}`}>About</a></li>
          </ul>
          
          {/* Desktop CTA Button */}
          <button 
            onClick={() => setShowAppointmentModal(true)}
            className="hidden lg:block font-dm-sans bg-gold text-green-deep px-6 py-[10px] rounded-[30px] font-semibold text-[0.88rem] transition-all hover:bg-gold-light hover:transform hover:translate-y-[-1px]"
          >
            Book Appointment
          </button>

          {/* Mobile Hamburger Menu */}
          <button 
            onClick={toggleMobileMenu}
            className="lg:hidden flex flex-col justify-center items-center w-8 h-8 space-y-1.5"
            aria-label="Toggle navigation menu"
          >
            <span className={`block w-6 h-0.5 transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''} ${(isBlogPage && !isScrolled) ? 'bg-black' : 'bg-cream'}`}></span>
            <span className={`block w-6 h-0.5 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''} ${(isBlogPage && !isScrolled) ? 'bg-black' : 'bg-cream'}`}></span>
            <span className={`block w-6 h-0.5 transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''} ${(isBlogPage && !isScrolled) ? 'bg-black' : 'bg-cream'}`}></span>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`lg:hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen 
            ? 'max-h-screen opacity-100' 
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          <div className={`px-[5%] py-6 ${
            isScrolled || isMobileMenuOpen 
              ? 'bg-green-deep/95 backdrop-blur-md' 
              : 'bg-green-deep/95'
          }`}>
            <ul className="flex flex-col gap-1 list-none m-0 font-dm-sans">
              {/* Mobile Programs Section */}
              <li className="border-t border-cream/20 pt-2 mt-2">
                <div className="text-[0.85rem] font-semibold text-gold/80 mb-2 px-3">Programs</div>
                <div className="space-y-1">
                  <a href="/programs" onClick={closeMobileMenu} className={`block text-[0.85rem] font-medium no-underline transition-colors hover:text-gold text-cream/85 py-1.5 px-3 rounded-lg ml-3 ${
                    pathname?.startsWith('/programs') ? 'bg-gold/20 text-gold font-semibold' : ''
                  }`}>All Programs</a>
                  <a href="/programs/adrenal-reset" onClick={closeMobileMenu} className={`block text-[0.85rem] font-medium no-underline transition-colors hover:text-gold text-cream/85 py-1.5 px-3 rounded-lg ml-3 ${
                    pathname === '/programs/adrenal-reset' ? 'bg-gold/20 text-gold font-semibold' : ''
                  }`}>Adrenal Reset</a>
                  <a href="/programs/gut-repair" onClick={closeMobileMenu} className={`block text-[0.85rem] font-medium no-underline transition-colors hover:text-gold text-cream/85 py-1.5 px-3 rounded-lg ml-3 ${
                    pathname === '/programs/gut-repair' ? 'bg-gold/20 text-gold font-semibold' : ''
                  }`}>Gut Repair</a>
                  <a href="/programs/hormone-balance" onClick={closeMobileMenu} className={`block text-[0.85rem] font-medium no-underline transition-colors hover:text-gold text-cream/85 py-1.5 px-3 rounded-lg ml-3 ${
                    pathname === '/programs/hormone-balance' ? 'bg-gold/20 text-gold font-semibold' : ''
                  }`}>Hormone Balance</a>
                  <a href="/programs/thyroid-recovery" onClick={closeMobileMenu} className={`block text-[0.85rem] font-medium no-underline transition-colors hover:text-gold text-cream/85 py-1.5 px-3 rounded-lg ml-3 ${
                    pathname === '/programs/thyroid-recovery' ? 'bg-gold/20 text-gold font-semibold' : ''
                  }`}>Thyroid Recovery</a>
                  <a href="/programs/immune-support" onClick={closeMobileMenu} className={`block text-[0.85rem] font-medium no-underline transition-colors hover:text-gold text-cream/85 py-1.5 px-3 rounded-lg ml-3 ${
                    pathname === '/programs/immune-support' ? 'bg-gold/20 text-gold font-semibold' : ''
                  }`}>Immune Support</a>
                </div>
              </li>
              
              {/* Mobile Services Section */}
              <li className="border-t border-cream/20 pt-2 mt-2">
                <div className="text-[0.85rem] font-semibold text-gold/80 mb-2 px-3">Services</div>
                <div className="space-y-1">
                  <a href="/#services" onClick={closeMobileMenu} className={`block text-[0.85rem] font-medium no-underline transition-colors hover:text-gold text-cream/85 py-1.5 px-3 rounded-lg ml-3 ${
                    isActiveLink('/#services') ? 'bg-gold/20 text-gold font-semibold' : ''
                  }`}>Our Services</a>
                  <a href="/#pricing" onClick={closeMobileMenu} className={`block text-[0.85rem] font-medium no-underline transition-colors hover:text-gold text-cream/85 py-1.5 px-3 rounded-lg ml-3 ${
                    isActiveLink('/#pricing') ? 'bg-gold/20 text-gold font-semibold' : ''
                  }`}>Pricing</a>
                  <a href="/elite" onClick={closeMobileMenu} className={`block text-[0.85rem] font-medium no-underline transition-colors hover:text-gold text-cream/85 py-1.5 px-3 rounded-lg ml-3 ${
                    isActiveLink('/elite') ? 'bg-gold/20 text-gold font-semibold' : ''
                  }`}>FXMed Elite</a>
                </div>
              </li>
              
              {/* Mobile Assessment Section */}
              <li className="border-t border-cream/20 pt-2 mt-2">
                <div className="text-[0.85rem] font-semibold text-gold/80 mb-2 px-3">Assessment</div>
                <div className="space-y-1">
                  <a href="/functional-health-analysis" onClick={closeMobileMenu} className={`block text-[0.85rem] font-medium no-underline transition-colors hover:text-gold text-cream/85 py-1.5 px-3 rounded-lg ml-3 ${
                    isActiveLink('/functional-health-analysis') ? 'bg-gold/20 text-gold font-semibold' : ''
                  }`}>Health Analysis</a>
                  <a href="/health-assessment" onClick={closeMobileMenu} className={`block text-[0.85rem] font-medium no-underline transition-colors hover:text-gold text-cream/85 py-1.5 px-3 rounded-lg ml-3 ${
                    isActiveLink('/health-assessment') ? 'bg-gold/20 text-gold font-semibold' : ''
                  }`}>Quick Assessment</a>
                </div>
              </li>
              
              <li className="border-t border-cream/20 pt-2 mt-2">
                <button onClick={() => { setShowContactModal(true); closeMobileMenu(); }} className={`block text-[0.9rem] font-medium transition-colors hover:text-gold text-cream/85 py-2 px-3 rounded-lg text-left w-full ${
                  ''
                }`}>Contact</button></li>
              <li><a href="/blog" onClick={closeMobileMenu} className={`block text-[0.9rem] font-medium no-underline transition-colors hover:text-gold text-cream/85 py-2 px-3 rounded-lg ${
                isActiveLink('/blog') ? 'bg-gold/20 text-gold font-semibold' : ''
              }`}>Blog</a></li>
              <li><a href="/#about" onClick={closeMobileMenu} className={`block text-[0.9rem] font-medium no-underline transition-colors hover:text-gold text-cream/85 py-2 px-3 rounded-lg ${
                isActiveLink('/#about') ? 'bg-gold/20 text-gold font-semibold' : ''
              }`}>About</a></li>
            </ul>
            
            <div className="mt-6 pt-6 border-t border-cream/20">
              <button 
                onClick={() => {
                  setShowAppointmentModal(true)
                  closeMobileMenu()
                }}
                className="block w-full text-center font-dm-sans bg-gold text-green-deep px-6 py-3 rounded-[30px] font-semibold text-[0.95rem] transition-all hover:bg-gold-light hover:transform hover:translate-y-[-1px]"
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      {showAppointmentModal && (
        <AppointmentModal isOpen={showAppointmentModal} onClose={() => setShowAppointmentModal(false)} />
      )}
      
      {showContactModal && (
        <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
      )}
    </>
  )
}
