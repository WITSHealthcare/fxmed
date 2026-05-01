'use client'

import { useState } from 'react'

export default function PhotoGallery() {
  const [activeTab, setActiveTab] = useState('team')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const openLightbox = (imageSrc: string) => {
    setSelectedImage(imageSrc)
    document.body.style.overflow = 'hidden'
  }

  const closeLightbox = () => {
    setSelectedImage(null)
    document.body.style.overflow = 'unset'
  }

  return (
    <>
      <section id="photo-gallery" className="bg-white py-[90px] px-[5%]">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-4">
              Photo Gallery
            </div>
            <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
              Life at FXMed
            </h2>
            <p className="font-dm-sans text-text-mid text-[1.05rem] leading-[1.7] max-w-[600px] mx-auto">
              A look inside our programs, team, and the care we deliver — directly to you.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-[#FCFFF0] rounded-[50px] p-1">
              <button 
                onClick={() => setActiveTab('testimonials')}
                className={`font-dm-sans px-6 py-2 rounded-[50px] text-[1rem] font-medium transition-all ${
                  activeTab === 'testimonials' 
                    ? 'bg-gold text-green-deep' 
                    : 'text-green-deep hover:bg-green-deep/10'
                }`}
              >
                Testimonials
              </button>
              <button 
                onClick={() => setActiveTab('team')}
                className={`font-dm-sans px-6 py-2 rounded-[50px] text-[1rem] font-medium transition-all ${
                  activeTab === 'team' 
                    ? 'bg-gold text-green-deep' 
                    : 'text-green-deep hover:bg-green-deep/10'
                }`}
              >
                Our Team
              </button>
              <button 
                onClick={() => setActiveTab('outreach')}
                className={`font-dm-sans px-6 py-2 rounded-[50px] text-[1rem] font-medium transition-all ${
                  activeTab === 'outreach' 
                    ? 'bg-gold text-green-deep' 
                    : 'text-green-deep hover:bg-green-deep/10'
                }`}
              >
                Community
              </button>
              <button 
                onClick={() => setActiveTab('van')}
                className={`font-dm-sans px-6 py-2 rounded-[50px] text-[1rem] font-medium transition-all ${
                  activeTab === 'van' 
                    ? 'bg-gold text-green-deep' 
                    : 'text-green-deep hover:bg-green-deep/10'
                }`}
              >
                Concierge
              </button>
            </div>
          </div>

          {/* Gallery Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* All Photos Tab */}
            {activeTab === 'all' && (
              <>
                <div className="lg:col-span-2 lg:row-span-2">
                  <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[400px] cursor-pointer group" onClick={() => openLightbox('/Hero Background.jpeg')}>
                    <img 
                      src="/Hero Background.jpeg" 
                      alt="FXMed Healthcare" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
                      <div className="text-white">
                        <h3 className="font-dm-sans font-bold text-[1.5rem] mb-2">
                          FXMed Healthcare Center
                        </h3>
                        <p className="font-dm-sans text-[0.9rem] opacity-90">
                          State-of-the-art medical facility
                        </p>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                      <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[200px] cursor-pointer group" onClick={() => openLightbox('/Dr Kike.jpg')}>
                  <img 
                    src="/Dr Kike.jpg" 
                    alt="Dr. Kike" 
                    className="w-full h-full object-cover object-[center_10%] group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                    <div className="text-white">
                      <h4 className="font-dm-sans font-bold text-[1.1rem]">Dr. Kike</h4>
                      <p className="font-dm-sans text-[0.8rem] opacity-90">Lead Physician</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[200px] cursor-pointer group" onClick={() => openLightbox('/diverse-business-team-meeting-office-hallway.jpg')}>
                  <img 
                    src="/diverse-business-team-meeting-office-hallway.jpg" 
                    alt="Medical Team" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                    <div className="text-white">
                      <h4 className="font-dm-sans font-bold text-[1.1rem]">Medical Team</h4>
                      <p className="font-dm-sans text-[0.8rem] opacity-90">Collaborative care</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[200px] cursor-pointer group" onClick={() => openLightbox('/black-pregnant-women-posing.jpg')}>
                  <img 
                    src="/black-pregnant-women-posing.jpg" 
                    alt="Maternal Care" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                    <div className="text-white">
                      <h4 className="font-dm-sans font-bold text-[1.1rem]">Maternal Care</h4>
                      <p className="font-dm-sans text-[0.8rem] opacity-90">Specialized services</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* FXMed Van Tab */}
            {activeTab === 'van' && (
              <>
                <div className="lg:col-span-2 lg:row-span-2">
                  <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[400px] cursor-pointer group" onClick={() => openLightbox('/fxmed-van/IMG_0287_1.jpeg')}>
                    <img 
                      src="/fxmed-van/IMG_0287_1.jpeg" 
                      alt="FXMed Mobile Unit" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                      <div className="text-white">
                        <h3 className="font-dm-sans font-bold text-[1.5rem] mb-2">
                          FXMed Mobile Unit
                        </h3>
                        <p className="font-dm-sans text-[1rem] opacity-90">
                          Bringing healthcare directly to your community
                        </p>
                        <div className="mt-3 flex gap-2">
                          <span className="bg-gold text-green-deep px-3 py-1 rounded-full text-xs font-semibold">Mobile Lab</span>
                          <span className="bg-gold text-green-deep px-3 py-1 rounded-full text-xs font-semibold">On-site Testing</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                      <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[200px] cursor-pointer group" onClick={() => openLightbox('/fxmed-van/IMG_0191.jpeg')}>
                  <img 
                    src="/fxmed-van/IMG_0191.jpeg" 
                    alt="FXMed Van Exterior" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                    <div className="text-white">
                      <h4 className="font-dm-sans font-bold text-[1.1rem] mb-1">Mobile Healthcare</h4>
                      <p className="font-dm-sans text-[0.8rem] opacity-90">Fully equipped medical unit</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[200px] cursor-pointer group" onClick={() => openLightbox('/fxmed-van/IMG_0273.jpeg')}>
                  <img 
                    src="/fxmed-van/IMG_0273.jpeg" 
                    alt="Medical Equipment" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                    <div className="text-white">
                      <h4 className="font-dm-sans font-bold text-[1.1rem] mb-1">Advanced Equipment</h4>
                      <p className="font-dm-sans text-[0.8rem] opacity-90">State-of-the-art technology</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[200px] cursor-pointer group" onClick={() => openLightbox('/fxmed-van/IMG_0300.jpeg')}>
                  <img 
                    src="/fxmed-van/IMG_0300.jpeg" 
                    alt="Van Interior" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                    <div className="text-white">
                      <h4 className="font-dm-sans font-bold text-[1.1rem] mb-1">Patient Care Area</h4>
                      <p className="font-dm-sans text-[0.8rem] opacity-90">Comfortable consultation space</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[200px] cursor-pointer group" onClick={() => openLightbox('/fxmed-van/IMG_0316.jpeg')}>
                  <img 
                    src="/fxmed-van/IMG_0316.jpeg" 
                    alt="Medical Services" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                    <div className="text-white">
                      <h4 className="font-dm-sans font-bold text-[1.1rem] mb-1">Comprehensive Services</h4>
                      <p className="font-dm-sans text-[0.8rem] opacity-90">Full medical care on wheels</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[200px] cursor-pointer group" onClick={() => openLightbox('/fxmed-van/IMG_0343.jpeg')}>
                  <img 
                    src="/fxmed-van/IMG_0343.jpeg" 
                    alt="Healthcare Team" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                    <div className="text-white">
                      <h4 className="font-dm-sans font-bold text-[1.1rem] mb-1">State-of-the-Art Interior</h4>
                      <p className="font-dm-sans text-[0.8rem] opacity-90">Fully equipped consultation space with advanced medical technology</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                                                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[200px] cursor-pointer group" onClick={() => openLightbox('/fxmed-van/IMG_0355.jpeg')}>
                  <img 
                    src="/fxmed-van/IMG_0355.jpeg" 
                    alt="Mobile Healthcare" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                    <div className="text-white">
                      <h4 className="font-dm-sans font-bold text-[1.1rem] mb-1">Accessible Care</h4>
                      <p className="font-dm-sans text-[0.8rem] opacity-90">Healthcare for everyone</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[200px] cursor-pointer group" onClick={() => openLightbox('/fxmed-van/IMG_0365.jpeg')}>
                  <img 
                    src="/fxmed-van/IMG_0365.jpeg" 
                    alt="Mobile Medical Services" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                    <div className="text-white">
                      <h4 className="font-dm-sans font-bold text-[1.1rem] mb-1">Mobile Laboratory</h4>
                      <p className="font-dm-sans text-[0.8rem] opacity-90">On-site diagnostic testing capabilities</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[200px] cursor-pointer group" onClick={() => openLightbox('/fxmed-van/IMG_0370.jpeg')}>
                  <img 
                    src="/fxmed-van/IMG_0370.jpeg" 
                    alt="Healthcare Technology" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                    <div className="text-white">
                      <h4 className="font-dm-sans font-bold text-[1.1rem] mb-1">Advanced Technology</h4>
                      <p className="font-dm-sans text-[0.8rem] opacity-90">Cutting-edge medical equipment on board</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Our Team Tab */}
            {activeTab === 'team' && (
              <>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[300px] cursor-pointer group col-span-1 lg:col-span-1" onClick={() => openLightbox('/Dr Kike.jpg')}>
                  <img 
                    src="/Dr Kike.jpg" 
                    alt="Dr. Kike" 
                    className="w-full h-full object-cover object-[center_10%] group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                    <div className="text-white">
                      <h3 className="font-dm-sans font-bold text-[1.3rem] mb-2">
                        Dr. Kike Oduba
                      </h3>
                      <p className="font-dm-sans text-[1rem] opacity-90 mb-2">
                        Medical Director & Lead Physician
                      </p>
                      <div className="flex gap-2">
                        <span className="bg-gold text-green-deep px-3 py-1 rounded-full text-xs font-semibold">Functional Medicine</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[300px] cursor-pointer group col-span-1 lg:col-span-1" onClick={() => openLightbox('/Team/3.jpg')}>
                  <img 
                    src="/Team/3.jpg" 
                    alt="Dr Oladele Isaac" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                    <div className="text-white">
                      <h3 className="font-dm-sans font-bold text-[1.3rem] mb-2">
                        Dr Oladele Isaac
                      </h3>
                      <p className="font-dm-sans text-[1rem] opacity-90 mb-2">
                        Physician
                      </p>
                      <div className="flex gap-2">
                        <span className="bg-gold text-green-deep px-3 py-1 rounded-full text-xs font-semibold">Primary Care</span>
                        <span className="bg-gold text-green-deep px-3 py-1 rounded-full text-xs font-semibold">Diagnosis</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[300px] cursor-pointer group col-span-1 lg:col-span-1" onClick={() => openLightbox('/Team/1.jpg')}>
                  <img 
                    src="/Team/1.jpg" 
                    alt="Esther Ajani" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                    <div className="text-white">
                      <h3 className="font-dm-sans font-bold text-[1.3rem] mb-2">
                        Esther Ajani
                      </h3>
                      <p className="font-dm-sans text-[1rem] opacity-90 mb-2">
                        Nutritionist
                      </p>
                      <div className="flex gap-2">
                        <span className="bg-gold text-green-deep px-3 py-1 rounded-full text-xs font-semibold">Diet Planning</span>
                        <span className="bg-gold text-green-deep px-3 py-1 rounded-full text-xs font-semibold">Wellness</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Community Outreach Tab */}
            {activeTab === 'outreach' && (
              <>
                <div className="lg:col-span-2">
                  <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[300px] cursor-pointer group" onClick={() => openLightbox('/community/IMG_0566.jpg')}>
                    <img 
                      src="/community/IMG_0566.jpg" 
                      alt="Medical Team" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                      <div className="text-white">
                        <h3 className="font-dm-sans font-bold text-[1.3rem] mb-2">
                          Medical Team
                        </h3>
                        <p className="font-dm-sans text-[1rem] opacity-90 mb-2">
                          Dedicated Healthcare Professionals
                        </p>
                        <div className="flex gap-2">
                          <span className="bg-gold text-green-deep px-3 py-1 rounded-full text-xs font-semibold">Professional</span>
                          <span className="bg-gold text-green-deep px-3 py-1 rounded-full text-xs font-semibold">Compassionate</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                      <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[300px] cursor-pointer group" onClick={() => openLightbox('/community/14th%20TOEMST%202025-22.jpg')}>
                  <img 
                    src="/community/14th%20TOEMST%202025-22.jpg" 
                    alt="Community Health Event" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                    <div className="text-white">
                      <h3 className="font-dm-sans font-bold text-[1.3rem] mb-2">
                        TOEMST Medical Outreach
                      </h3>
                      <p className="font-dm-sans text-[1rem] opacity-90 mb-2">
                        14th Annual Medical Mission Program
                      </p>
                      <div className="flex gap-2">
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[300px] cursor-pointer group" onClick={() => openLightbox('/community/14th%20TOEMST%202025-561.jpg')}>
                  <img 
                    src="/community/14th%20TOEMST%202025-561.jpg" 
                    alt="Community Healthcare Services" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                    <div className="text-white">
                      <h3 className="font-dm-sans font-bold text-[1.3rem] mb-2">
                        Sports Medicine & First Aid
                      </h3>
                      <p className="font-dm-sans text-[1rem] opacity-90 mb-2">
                        Emergency Medical Response & Athletic Care
                      </p>
                      <div className="flex gap-2">
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[300px] cursor-pointer group" onClick={() => openLightbox('/community/IMG_0743.jpg')}>
                  <img 
                    src="/community/IMG_0743.jpg" 
                    alt="Community Health Screening" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                    <div className="text-white">
                      <h3 className="font-dm-sans font-bold text-[1.3rem] mb-2">
                        Health Screening
                      </h3>
                      <p className="font-dm-sans text-[1rem] opacity-90 mb-2">
                        Preventive Health Services
                      </p>
                      <div className="flex gap-2">
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[300px] cursor-pointer group" onClick={() => openLightbox('/community/IMG_0833.jpg')}>
                  <img 
                    src="/community/IMG_0833.jpg" 
                    alt="Patient Care Services" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                    <div className="text-white">
                      <h3 className="font-dm-sans font-bold text-[1.3rem] mb-2">
                        Patient Care
                      </h3>
                      <p className="font-dm-sans text-[1rem] opacity-90 mb-2">
                        Quality Healthcare Delivery
                      </p>
                      <div className="flex gap-2">
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative rounded-[20px] overflow-hidden shadow-lg h-full min-h-[300px] cursor-pointer group" onClick={() => openLightbox('/community/fxmed%201.jpg')}>
                  <img 
                    src="/community/fxmed%201.jpg" 
                    alt="FXMed Community Services" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                    <div className="text-white">
                      <h3 className="font-dm-sans font-bold text-[1.3rem] mb-2">
                        FXMed Services
                      </h3>
                      <p className="font-dm-sans text-[1.rem] opacity-90 mb-2">
                        Mobile Healthcare Solutions
                      </p>
                      <div className="flex gap-2">
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Testimonials Tab */}
            {activeTab === 'testimonials' && (
              <div className="col-span-full">
                <div className="text-center mb-8">
                  <h3 className="font-dm-sans font-bold text-2xl text-green-deep mb-4">
                    Real Experiences from Real People
                  </h3>
                  <p className="font-dm-sans text-text-mid text-lg leading-[1.7] max-w-3xl mx-auto">
                    Hear directly from our patients about their transformative health journeys with FXMed.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Testimonial Video 1 */}
                  <div className="bg-white rounded-[20px] overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="relative aspect-video">
                      <iframe
                        className="w-full h-full"
                        src="https://www.youtube.com/embed/KAKvZy2uWkk"
                        title="FXMed Patient Testimonial 1"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <div className="p-4">
                      <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">
                        Life-Changing Results
                      </h4>
                      <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">
                        Patient shares their journey to better health through our functional medicine approach.
                      </p>
                    </div>
                  </div>

                  {/* Testimonial Video 2 */}
                  <div className="bg-white rounded-[20px] overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="relative aspect-video">
                      <iframe
                        className="w-full h-full"
                        src="https://www.youtube.com/embed/81dH7g08_p0"
                        title="FXMed Patient Testimonial 2"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <div className="p-4">
                      <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">
                        Hormonal Balance Success
                      </h4>
                      <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">
                        How our hormone balance program helped restore vitality and wellness.
                      </p>
                    </div>
                  </div>

                  {/* Testimonial Video 3 */}
                  <div className="bg-white rounded-[20px] overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="relative aspect-video">
                      <iframe
                        className="w-full h-full"
                        src="https://www.youtube.com/embed/n-rr89ic7f0"
                        title="FXMed Patient Testimonial 3"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <div className="p-4">
                      <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">
                        Gut Health Transformation
                      </h4>
                      <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">
                        Patient's experience with our comprehensive gut repair program.
                      </p>
                    </div>
                  </div>

                  {/* Testimonial Video 4 */}
                  <div className="bg-white rounded-[20px] overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="relative aspect-video">
                      <iframe
                        className="w-full h-full"
                        src="https://www.youtube.com/embed/UpU2Zjwvg2o"
                        title="FXMed Patient Testimonial 4"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <div className="p-4">
                      <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">
                        Thyroid Recovery Journey
                      </h4>
                      <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">
                        Success story from our thyroid recovery program patient.
                      </p>
                    </div>
                  </div>

                                  </div>

                {/* View All Testimonials Button */}
                <div className="text-center mt-12">
                  <a 
                    href="https://www.youtube.com/playlist?list=PLssPJ60qYTzmv964VHnwDABCN6_mtwegD"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-lg transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg inline-flex items-center gap-2"
                  >
                    View All Testimonials on YouTube
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={closeLightbox}
        >
          <div className="relative max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <img
              src={selectedImage}
              alt="Enlarged view"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            <button
              onClick={closeLightbox}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black/50 hover:bg-black/70 px-4 py-2 rounded-full text-sm font-medium transition-colors"
            >
              Close (ESC)
            </button>
          </div>
        </div>
      )}
    </>
  )
}
