export default function FunctionalHealthSummary() {
  return (
    <section className="py-20 px-[5%] bg-gradient-to-br from-green-deep/5 to-gold/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-semibold tracking-[0.14em] uppercase mb-6">
              Advanced Diagnostics
            </div>
            <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-6">
              Go Deeper with Functional Health Analysis
            </h2>
            <p className="font-dm-sans text-black text-[1.05rem] leading-[1.7] mb-8">
              While our health risk assessment provides valuable insights, our comprehensive functional health analysis 
              dives deeper into your unique biology. We examine genetic markers, metabolic patterns, hormonal balance, 
              and lifestyle factors to create a complete picture of your health.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-gold rounded-full flex-shrink-0 mt-1"></div>
                <div>
                  <h3 className="font-dm-sans font-semibold text-green-deep mb-2">Comprehensive Evaluation</h3>
                  <p className="font-dm-sans text-text-mid leading-[1.6]">
                    5-step detailed analysis covering personal health, lifestyle, medical history, and wellness goals
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-gold rounded-full flex-shrink-0 mt-1"></div>
                <div>
                  <h3 className="font-dm-sans font-semibold text-green-deep mb-2">Root Cause Analysis</h3>
                  <p className="font-dm-sans text-text-mid leading-[1.6]">
                    Identify underlying imbalances rather than just treating symptoms
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-gold rounded-full flex-shrink-0 mt-1"></div>
                <div>
                  <h3 className="font-dm-sans font-semibold text-green-deep mb-2">Personalized Protocols</h3>
                  <p className="font-dm-sans text-text-mid leading-[1.6]">
                    Custom wellness strategies tailored to your unique biology and health goals
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-gold rounded-full flex-shrink-0 mt-1"></div>
                <div>
                  <h3 className="font-dm-sans font-semibold text-green-deep mb-2">Preventive Focus</h3>
                  <p className="font-dm-sans text-text-mid leading-[1.6]">
                    Predict and prevent health issues before they become chronic conditions
                  </p>
                </div>
              </div>
            </div>

            <a 
              href="/functional-health-analysis"
              className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] no-underline transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg inline-block"
            >
              Learn More →
            </a>
          </div>

          <div className="relative">
            <div className="bg-white rounded-[24px] p-8 shadow-xl">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                  <div
                    className="w-10 h-10 bg-green-deep"
                    style={{
                      WebkitMask: 'url("/Dna.svg") center / contain no-repeat',
                      mask: 'url("/Dna.svg") center / contain no-repeat',
                    }}
                  />
                </div>
                <h3 className="font-dm-sans font-bold text-green-deep text-2xl mb-2">
                  What Makes Our Analysis Different?
                </h3>
                <p className="font-dm-sans text-text-mid">
                  Science-backed insights for optimal wellness
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-deep/5 rounded-lg">
                  <div className="w-8 h-8 flex-shrink-0 bg-green-deep"
                    style={{
                      WebkitMask: 'url("/TestTube.svg") center / contain no-repeat',
                      mask: 'url("/TestTube.svg") center / contain no-repeat',
                    }}
                  />
                  <div>
                    <h4 className="font-dm-sans font-semibold text-green-deep">Advanced Lab Analysis</h4>
                    <p className="text-sm text-text-mid">Comprehensive blood work interpretation</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gold/20 rounded-lg">
                  <div className="w-8 h-8 flex-shrink-0 bg-green-deep"
                    style={{
                      WebkitMask: 'url("/lets-icons_chemistry.svg") center / contain no-repeat',
                      mask: 'url("/lets-icons_chemistry.svg") center / contain no-repeat',
                    }}
                  />
                  <div>
                    <h4 className="font-dm-sans font-semibold text-green-deep">Hormonal Balance</h4>
                    <p className="text-sm text-text-mid">Endocrine system optimization</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-green-deep/5 rounded-lg">
                  <div className="w-8 h-8 flex-shrink-0 bg-green-deep"
                    style={{
                      WebkitMask: 'url("/Asterisk.svg") center / contain no-repeat',
                      mask: 'url("/Asterisk.svg") center / contain no-repeat',
                    }}
                  />
                  <div>
                    <h4 className="font-dm-sans font-semibold text-green-deep">Risk Prediction</h4>
                    <p className="text-sm text-text-mid">Identify future health challenges</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gold/20 rounded-lg">
                  <div className="w-8 h-8 flex-shrink-0 bg-green-deep"
                    style={{
                      WebkitMask: 'url("/Steps.svg") center / contain no-repeat',
                      mask: 'url("/Steps.svg") center / contain no-repeat',
                    }}
                  />
                  <div>
                    <h4 className="font-dm-sans font-semibold text-green-deep">Custom Protocols</h4>
                    <p className="text-sm text-text-mid">Personalized wellness strategies</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gold/10 rounded-lg border-l-4 border-gold">
                <p className="text-sm font-dm-sans text-green-deep font-medium mb-1">
                  Perfect for you if:
                </p>
                <p className="text-sm text-text-mid">
                  You want comprehensive insights beyond basic health screening, have chronic health issues, 
                  or want to optimize your wellness with personalized, science-backed strategies.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
