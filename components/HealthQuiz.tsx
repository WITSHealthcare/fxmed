'use client'

import { useState } from 'react'

interface QuizStep {
  id: number
  question: string
  options: { emoji: string; text: string }[]
}

const quizSteps: QuizStep[] = [
  {
    id: 1,
    question: "How would you describe your energy levels on most days?",
    options: [
      { emoji: "😴", text: "Exhausted — I need caffeine just to function" },
      { emoji: "⚡", text: "Inconsistent — good days and bad days" },
      { emoji: "📉", text: "Energy crashes in the afternoon" },
      { emoji: "🌤️", text: "Mostly good but could be better" }
    ]
  },
  {
    id: 2,
    question: "Which of these symptoms are you experiencing?",
    options: [
      { emoji: "🤰", text: "Bloating, gas, or digestive issues" },
      { emoji: "😤", text: "Mood swings, weight gain, or irregular cycles" },
      { emoji: "🧠", text: "Hair loss, cold intolerance, or brain fog" },
      { emoji: "🤒", text: "Frequent illness, inflammation, or fatigue" }
    ]
  },
  {
    id: 3,
    question: "How long have you been experiencing these health challenges?",
    options: [
      { emoji: "📅", text: "Less than 3 months" },
      { emoji: "📆", text: "3–12 months" },
      { emoji: "📋", text: "1–5 years" },
      { emoji: "⏰", text: "More than 5 years — chronic issue" }
    ]
  },
  {
    id: 4,
    question: "What is your biggest health goal right now?",
    options: [
      { emoji: "⚡", text: "More energy and vitality" },
      { emoji: "⚖️", text: "Healthy weight and metabolism" },
      { emoji: "🔄", text: "Hormonal balance and mood stability" },
      { emoji: "🛡️", text: "Disease prevention and longevity" }
    ]
  },
  {
    id: 5,
    question: "How do you prefer to receive your healthcare?",
    options: [
      { emoji: "🏠", text: "Home visits — I love the convenience" },
      { emoji: "💻", text: "Virtual consultations — I'm always on the go" },
      { emoji: "🔄", text: "A mix of both works best for me" },
      { emoji: "❓", text: "I'm not sure — help me decide" }
    ]
  }
]

const results = {
  "Bloating, gas, or digestive issues": {
    program: "Gut Repair Program",
    description: "Your digestive symptoms indicate gut inflammation and potential microbiome imbalance. Our Gut Repair Program uses advanced testing to identify root causes and restore optimal digestive function through targeted protocols."
  },
  "Mood swings, weight gain, or irregular cycles": {
    program: "Hormone Balance Program", 
    description: "Your symptoms suggest hormonal imbalances affecting metabolism and mood. Our Hormone Balance Program uses comprehensive hormone testing and personalized interventions to restore optimal endocrine function."
  },
  "Hair loss, cold intolerance, or brain fog": {
    program: "Thyroid Recovery Program",
    description: "Your symptoms indicate potential thyroid dysfunction affecting metabolism and cognitive function. Our Thyroid Recovery Program uses advanced thyroid testing and targeted therapies to restore optimal thyroid health."
  },
  "Frequent illness, inflammation, or fatigue": {
    program: "Immune Support Program",
    description: "Your symptoms suggest immune system dysfunction and chronic inflammation. Our Immune Support Program uses comprehensive immune testing and personalized protocols to restore optimal immune function."
  }
}

export default function HealthQuiz() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [showResult, setShowResult] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string>('')

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option)
  }

  const handleNext = () => {
    if (!selectedOption) return

    const newAnswers = [...answers, selectedOption]
    setAnswers(newAnswers)

    if (currentStep < quizSteps.length - 1) {
      setCurrentStep(currentStep + 1)
      setSelectedOption('')
    } else {
      setShowResult(true)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setSelectedOption(answers[currentStep - 1])
      setAnswers(answers.slice(0, -1))
    }
  }

  const getResult = () => {
    // Use Question 2 (index 1) as primary determinant for program recommendation
    const symptomAnswer = answers[1]
    return results[symptomAnswer as keyof typeof results] || {
      program: "Comprehensive Assessment Program",
      description: "Based on your responses, we recommend a comprehensive health assessment to identify your unique needs and create a personalized wellness plan."
    }
  }

  const resetQuiz = () => {
    setCurrentStep(0)
    setAnswers([])
    setShowResult(false)
    setSelectedOption('')
  }

  if (showResult) {
    const result = getResult()
    
    return (
      <div className="max-w-[760px] mx-auto mt-12 bg-gradient-to-br from-green-deep to-[#1e4a35] border border-gold/20 rounded-[24px] p-12 text-center relative">
        <button
          onClick={resetQuiz}
          className="absolute top-4 right-4 bg-transparent text-cream/60 hover:text-gold-light transition-colors p-2 rounded-lg hover:bg-cream/10"
          title="Retake Quiz"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <div className="inline-block bg-gold/20 border border-gold text-gold-light px-6 py-2 rounded-[30px] text-[0.85rem] font-dm-sans mb-5">
          Your Personalized Health Plan
        </div>
        <h3 className="font-dm-sans font-bold text-white text-2xl mb-4">
          Recommended for You
        </h3>
        <p className="font-dm-sans text-cream/75 text-[1rem] leading-[1.7] mb-8 max-w-[500px] mx-auto">
          {result.description}
        </p>
        <div className="flex flex-wrap justify-center gap-2.5 mb-8">
          <span className="bg-green-light/15 border border-green-light text-green-light px-[18px] py-1.5 rounded-[30px] text-[0.88rem] font-dm-sans">
            {result.program}
          </span>
        </div>
        <p className="font-dm-sans text-cream text-[1.1rem] leading-[1.6] mb-6">
          Want to know what is wrong and what to do?<br/>
          Take a deep dive into your health status
        </p>
        <div className="flex gap-4 justify-center">
          <a href="/functional-health-analysis" className="bg-gold text-green-deep px-8 py-3 rounded-[30px] font-semibold text-[0.95rem] font-dm-sans no-underline transition-all hover:bg-gold-light inline-block">
            Take a Functional Health Analysis
          </a>
          <a href="/#contact" className="bg-transparent text-cream border border-cream/30 px-8 py-3 rounded-[30px] font-semibold text-[0.95rem] font-dm-sans transition-all hover:border-cream hover:bg-cream/8 no-underline">
            Book an Appointment
          </a>
        </div>
      </div>
    )
  }

  const step = quizSteps[currentStep]

  return (
    <div className="max-w-[760px] mx-auto mt-12 bg-gradient-to-br from-green-deep to-[#1e4a35] border border-gold/20 rounded-[24px] p-12">
      {/* Progress */}
      <div className="flex gap-2 mb-9">
        {quizSteps.map((_, index) => (
          <div 
            key={index}
            className={`h-1 flex-1 rounded-[4px] transition-colors ${
              index < currentStep ? 'bg-green-light' : 
              index === currentStep ? 'bg-gold' : 'bg-white/15'
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <div className={`${currentStep === 0 ? 'animate-fade-in-up' : ''}`}>
        <h3 className="font-dm-sans text-white text-[1.4rem] mb-7 leading-[1.4]">
          {step.question}
        </h3>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {step.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionSelect(option.text)}
              className={`bg-white/8 border border-cream/15 rounded-[12px] p-4 text-cream text-[0.95rem] font-dm-sans cursor-pointer transition-all text-left hover:border-gold hover:bg-gold/12 hover:text-gold-light ${
                selectedOption === option.text ? 'border-gold bg-gold/20 text-gold-light' : ''
              }`}
            >
              <span className="text-[1.3rem] block mb-1.5">{option.emoji}</span>
              {option.text}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="bg-transparent text-cream border border-cream/30 px-8 py-3 rounded-[30px] font-semibold text-[0.95rem] font-dm-sans transition-all hover:border-cream hover:bg-cream/8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          
          <span className="font-dm-sans text-cream/45 text-[0.85rem]">
            {currentStep + 1} of {quizSteps.length}
          </span>
          
          <button
            onClick={handleNext}
            disabled={!selectedOption}
            className="bg-gold text-green-deep px-8 py-3 rounded-[30px] font-semibold text-[0.95rem] font-dm-sans transition-all hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentStep === quizSteps.length - 1 ? 'Get Results' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
