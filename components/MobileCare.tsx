'use client'

export default function MobileCare() {
  return (
    <section className="relative h-[420px] overflow-hidden flex items-center justify-center">
      {/* Background Image */}
      <div className="absolute inset-0 bg-cover bg-center brightness-[0.45]" 
           style={{backgroundImage: "url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')"}}>
      </div>
      
      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(15,36,25,0.85)] to-[rgba(26,61,46,0.5)]"></div>
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-[700px] px-5">
        <h2 className="font-dm-sans font-bold text-white text-[clamp(2rem,5vw,3.5rem)] mb-4">
          Healthcare on wheels,<br/>delivered to your door
        </h2>
        <p className="font-dm-sans text-cream/80 text-[1.1rem] mb-7">
          Our fully equipped mobile clinic brings diagnostics, consultations, IV therapy, and more — right to your home, office, or community.
        </p>
        <a href="/#pricing" className="font-dm-sans bg-gold text-green-deep px-8 py-3 rounded-[30px] font-semibold text-[0.95rem] no-underline transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] inline-block">
          View Packages
        </a>
      </div>
    </section>
  )
}
