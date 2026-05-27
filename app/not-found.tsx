'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect } from 'react'

export default function NotFound() {
  useEffect(() => {
    // Add some entrance animations
    const elements = document.querySelectorAll('.animate-fade-in-up')
    elements.forEach((el, index) => {
      setTimeout(() => {
        el.classList.add('animate-fade-in-up-active')
      }, index * 100)
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#FCFFF0] flex items-center justify-center px-[5%] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating medical icons */}
        <div className="absolute top-20 left-10 w-16 h-16 bg-green-deep/10 rounded-[20px] flex items-center justify-center animate-float">
          <Image src="/Stethoscope.svg" alt="Stethoscope" width={32} height={32} />
        </div>
        <div className="absolute top-40 right-20 w-20 h-20 bg-gold/10 rounded-[20px] flex items-center justify-center animate-float-delayed">
          <Image src="/Pill.svg" alt="Pill" width={40} height={40} />
        </div>
        <div className="absolute bottom-32 left-20 w-16 h-16 bg-green-mid/10 rounded-[20px] flex items-center justify-center animate-float">
          <Image src="/TestTube.svg" alt="Test Tube" width={32} height={32} />
        </div>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-green-deep/5 rounded-[20px] flex items-center justify-center animate-float-delayed">
          <Image src="/Sparkle.svg" alt="Sparkle" width={48} height={48} />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* 404 Number */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="font-dm-sans font-extrabold text-[clamp(8rem,15vw,12rem)] leading-[1] text-green-deep opacity-20">
            404
          </h1>
        </div>

        {/* Error Message */}
        <div className="mb-8 animate-fade-in-up">
          <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-semibold tracking-[0.14em] uppercase mb-4">
            Oops! Page Not Found
          </div>
          <h2 className="font-dm-sans font-extrabold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
            This prescription seems to be <span className="italic bg-[#CADE68] px-2 rounded">missing</span>
          </h2>
          <p className="font-dm-sans text-text-mid text-[1.1rem] leading-[1.7] max-w-2xl mx-auto">
            Don't worry, even the best health journeys take unexpected turns. The page you're looking for might have been moved, deleted, or never existed at all.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up">
          <Link 
            href="/"
            className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-bold text-lg hover:bg-gold-light transition-all transform hover:translate-y-[-2px] hover:shadow-xl inline-block text-center no-underline"
          >
            Return Home
          </Link>
          <button 
            onClick={() => window.history.back()}
            className="font-dm-sans bg-transparent text-green-deep px-8 py-4 rounded-[50px] font-bold text-lg border-2 border-green-deep hover:bg-green-deep hover:text-cream transition-all transform hover:translate-y-[-2px] hover:shadow-xl inline-block text-center"
          >
            Go Back
          </button>
        </div>

        {/* Helpful Links */}
        <div className="mt-16 animate-fade-in-up">
          <h3 className="font-dm-sans font-semibold text-green-deep text-lg mb-6">
            Looking for something specific?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <Link 
              href="#about"
              className="bg-white rounded-[16px] p-4 border border-green-deep/10 hover:shadow-custom transition-all group no-underline"
            >
              <div className="w-12 h-12 rounded-[12px] bg-green-deep/10 flex items-center justify-center mb-3 group-hover:bg-green-deep/20 transition-colors">
                <Image src="/Hospital.svg" alt="About" width={24} height={24} />
              </div>
              <h4 className="font-dm-sans font-semibold text-green-deep text-sm mb-1">About Us</h4>
              <p className="font-dm-sans text-text-mid text-xs">Learn more about FXMed</p>
            </Link>

            <Link 
              href="#programs"
              className="bg-white rounded-[16px] p-4 border border-green-deep/10 hover:shadow-custom transition-all group no-underline"
            >
              <div className="w-12 h-12 rounded-[12px] bg-green-deep/10 flex items-center justify-center mb-3 group-hover:bg-green-deep/20 transition-colors">
                <Image src="/OrangeSlice.svg" alt="Programs" width={24} height={24} />
              </div>
              <h4 className="font-dm-sans font-semibold text-green-deep text-sm mb-1">Programs</h4>
              <p className="font-dm-sans text-text-mid text-xs">Explore our wellness programs</p>
            </Link>

            <Link 
              href="#pricing"
              className="bg-white rounded-[16px] p-4 border border-green-deep/10 hover:shadow-custom transition-all group no-underline"
            >
              <div className="w-12 h-12 rounded-[12px] bg-green-deep/10 flex items-center justify-center mb-3 group-hover:bg-green-deep/20 transition-colors">
                <Image src="/Dna.svg" alt="Pricing" width={24} height={24} />
              </div>
              <h4 className="font-dm-sans font-semibold text-green-deep text-sm mb-1">Pricing</h4>
              <p className="font-dm-sans text-text-mid text-xs">View our consultation plans</p>
            </Link>

            <Link 
              href="/elite"
              className="bg-white rounded-[16px] p-4 border border-green-deep/10 hover:shadow-custom transition-all group no-underline"
            >
              <div className="w-12 h-12 rounded-[12px] bg-gold/10 flex items-center justify-center mb-3 group-hover:bg-gold/20 transition-colors">
                <Image src="/FXMed Elite White.svg" alt="Elite" width={24} height={24} />
              </div>
              <h4 className="font-dm-sans font-semibold text-green-deep text-sm mb-1">FXMed Elite</h4>
              <p className="font-dm-sans text-text-mid text-xs">Premium concierge care</p>
            </Link>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-12 animate-fade-in-up">
          <p className="font-dm-sans text-text-mid text-sm mb-4">
            Still can't find what you're looking for?
          </p>
          <button 
            onClick={() => {
              // Trigger contact modal if available, or scroll to contact section
              const contactElement = document.getElementById('contact')
              if (contactElement) {
                contactElement.scrollIntoView({ behavior: 'smooth' })
              } else {
                window.location.href = '/#contact'
              }
            }}
            className="font-dm-sans text-green-deep font-medium text-sm hover:text-green-mid transition-colors underline"
          >
            Contact Our Support Team
          </button>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        @keyframes float-delayed {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(-3deg);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
          animation-delay: 2s;
        }

        .animate-fade-in-up {
          opacity: 0;
          transform: translateY(30px);
        }

        .animate-fade-in-up-active {
          animation: fade-in-up 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
