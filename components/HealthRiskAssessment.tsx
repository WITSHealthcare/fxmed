'use client'

import { useState } from 'react'
import Image from 'next/image'
import BookingModal from './BookingModal'

interface Question {
  question: string
  type: 'single' | 'multiple' | 'scale'
  options: string[]
}

interface Assessment {
  name: string
  questions: Question[]
}

const ASSESSMENTS: Record<string, Assessment> = {
  children: {
    name: "Children's Health",
    questions: [
      {
        question: "What is your primary concern?",
        type: "single",
        options: [
          "Frequent allergic reactions or sensitivities",
          "Attention and focus difficulties",
          "Developmental milestones or delays",
          "Behavioral or social challenges",
          "Multiple concerns"
        ]
      },
      {
        question: "How old is your child?",
        type: "single",
        options: [
          "0-2 years",
          "3-5 years",
          "6-10 years",
          "11-15 years",
          "16+ years"
        ]
      },
      {
        question: "Which symptoms have you noticed? (Select all that apply)",
        type: "multiple",
        options: [
          "Skin rashes or eczema",
          "Digestive issues (constipation, diarrhea, stomach pain)",
          "Difficulty concentrating or staying on task",
          "Speech or language delays",
          "Sleep problems",
          "Hyperactivity or impulsivity",
          "Social interaction difficulties",
          "Repetitive behaviors or intense interests",
          "Food sensitivities or picky eating"
        ]
      },
      {
        question: "How long have these concerns been present?",
        type: "single",
        options: [
          "Less than 3 months",
          "3-6 months",
          "6-12 months",
          "1-2 years",
          "More than 2 years"
        ]
      }
    ]
  },
  hormones: {
    name: "Hormones & Fertility",
    questions: [
      {
        question: "What brings you here today?",
        type: "single",
        options: [
          "Thyroid concerns (fatigue, weight changes, hair loss)",
          "Fertility challenges or trying to conceive",
          "Menstrual cycle irregularities",
          "Menopause or perimenopause symptoms",
          "Sexual health concerns (low libido, Erectile Dysfunction)",
          "Multiple hormonal concerns"
        ]
      },
      {
        question: "How would you rate your energy levels?",
        type: "scale",
        options: ["Very Low", "Low", "Moderate", "Good", "Excellent"]
      },
      {
        question: "Which symptoms are you experiencing? (Select all that apply)",
        type: "multiple",
        options: [
          "Unexplained weight gain or difficulty losing weight",
          "Extreme fatigue despite adequate sleep",
          "Hair loss or thinning",
          "Cold sensitivity or always feeling cold",
          "Irregular or absent periods",
          "Heavy or painful periods",
          "Hot flashes or night sweats",
          "Low libido or sexual dysfunction",
          "Mood swings, anxiety, or depression",
          "Brain fog or difficulty concentrating",
          "Difficulty conceiving (6+ months trying)"
        ]
      },
      {
        question: "How long have you been experiencing these symptoms?",
        type: "single",
        options: [
          "Less than 3 months",
          "3-6 months",
          "6-12 months",
          "1-3 years",
          "More than 3 years"
        ]
      }
    ]
  },
  heart: {
    name: "Heart & Metabolic Health",
    questions: [
      {
        question: "What is your primary health concern?",
        type: "single",
        options: [
          "High blood pressure or hypertension",
          "Blood sugar issues or diabetes risk",
          "High cholesterol or heart disease risk",
          "Previous stroke or stroke risk",
          "Metabolic syndrome or weight management",
          "General cardiovascular prevention"
        ]
      },
      {
        question: "Do you have a family history of heart disease, diabetes, or stroke?",
        type: "single",
        options: [
          "Yes, parent or sibling diagnosed before age 55",
          "Yes, diagnosed after age 55",
          "Yes, in extended family",
          "No family history",
          "Not sure"
        ]
      },
      {
        question: "Which symptoms or risk factors do you have? (Select all that apply)",
        type: "multiple",
        options: [
          "High blood pressure (or on BP medication)",
          "High blood sugar or pre-diabetes",
          "High cholesterol",
          "Excess weight, especially around waist",
          "Chest pain or discomfort",
          "Shortness of breath with activity",
          "Frequent fatigue",
          "Numbness or tingling in extremities",
          "Poor circulation or cold hands/feet"
        ]
      },
      {
        question: "How would you describe your diet?",
        type: "single",
        options: [
          "High in processed foods and sugar",
          "Moderate - mix of healthy and unhealthy",
          "Mostly whole foods, minimal processing",
          "Very healthy - Mediterranean or plant-based",
          "Not sure"
        ]
      }
    ]
  },
  cancer: {
    name: "Cancer Risk",
    questions: [
      {
        question: "What type of cancer screening are you interested in?",
        type: "single",
        options: [
          "Breast cancer screening",
          "Prostate cancer screening",
          "Colon cancer screening",
          "Multiple cancer screenings",
          "General cancer risk assessment"
        ]
      },
      {
        question: "Do you have a family history of cancer?",
        type: "single",
        options: [
          "Yes, immediate family (parent, sibling, child)",
          "Yes, extended family (grandparent, aunt, uncle)",
          "No known family history",
          "Not sure"
        ]
      },
      {
        question: "What is your age range?",
        type: "single",
        options: [
          "Under 30",
          "30-39",
          "40-49",
          "50-64",
          "65+"
        ]
      },
      {
        question: "When was your last cancer screening?",
        type: "single",
        options: [
          "Within the past year",
          "1-2 years ago",
          "3-5 years ago",
          "More than 5 years ago",
          "Never had screening"
        ]
      }
    ]
  }
}

interface Answer {
  question: string
  answer: string | string[] | { value: number; label: string }
  type: string
}

interface AssessmentResult {
  riskLevel: 'low' | 'moderate' | 'high'
  title: string
  summary: string
  insights: Array<{
    title: string
    text: string
  }>
  recommendations: string
}

export default function HealthRiskAssessment({ headingLevel = 'h2' }: { headingLevel?: 'h1' | 'h2' } = {}) {
  // Rendered as a section on the homepage (which owns its own h1) and as the
  // primary content of /health-assessment, where this heading is the page h1.
  const Heading = headingLevel
  const [screen, setScreen] = useState<'welcome' | 'assessment' | 'results'>('welcome')
  const [category, setCategory] = useState<string>('')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [bookingType, setBookingType] = useState<'telemedicine' | 'home-visit'>('telemedicine')

  const categories = [
    {
      id: 'children',
      icon: '/BlackChild.png',
      title: "Children's Health",
      subtitle: "Allergies, ADHD, Autism, Development"
    },
    {
      id: 'hormones',
      icon: '/Hormone.png',
      title: "Hormones & Fertility",
      subtitle: "Thyroid, Erectile Dysfunction, Menstrual, Trying To Conceive, Menopause"
    },
    {
      id: 'heart',
      icon: '/Heart.png',
      title: "Heart & Metabolic",
      subtitle: "Diabetes, Hypertension, Stroke"
    },
    {
      id: 'cancer',
      icon: '/Cancer.png',
      title: "Cancer Risk",
      subtitle: "Breast, Prostate, Colon, Others"
    }
  ]

  const startAssessment = (catId: string) => {
    setCategory(catId)
    setScreen('assessment')
    setCurrentQuestion(0)
    setAnswers([])
    setSelectedAnswers([])
  }

  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswers.includes(answer)) {
      setSelectedAnswers(selectedAnswers.filter(a => a !== answer))
    } else {
      setSelectedAnswers([...selectedAnswers, answer])
    }
  }

  const nextQuestion = () => {
    const assessment = ASSESSMENTS[category]
    const question = assessment.questions[currentQuestion]
    
    let finalAnswer: string | string[] | { value: number; label: string }
    
    if (question.type === 'single') {
      finalAnswer = selectedAnswers[0]
    } else if (question.type === 'multiple') {
      finalAnswer = selectedAnswers
    } else if (question.type === 'scale') {
      const index = question.options.indexOf(selectedAnswers[0])
      finalAnswer = { value: index + 1, label: selectedAnswers[0] }
    } else {
      finalAnswer = selectedAnswers[0]
    }

    const newAnswers = [...answers, {
      question: question.question,
      answer: finalAnswer,
      type: question.type
    }]
    
    setAnswers(newAnswers)
    setSelectedAnswers([])

    if (currentQuestion < assessment.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      completeAssessment(newAnswers)
    }
  }

  const backQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
      const prevAnswer = answers[currentQuestion - 1]
      if (Array.isArray(prevAnswer.answer)) {
        setSelectedAnswers(prevAnswer.answer)
      } else if (typeof prevAnswer.answer === 'object') {
        setSelectedAnswers([prevAnswer.answer.label])
      } else {
        setSelectedAnswers([prevAnswer.answer])
      }
    } else {
      // Go back to welcome screen
      setScreen('welcome')
      setCurrentQuestion(0)
      setAnswers([])
      setSelectedAnswers([])
      setCategory('')
    }
  }

  const calculateRiskScore = (answers: Answer[], category: string): { score: number; riskLevel: 'low' | 'moderate' | 'high'; insights: AssessmentResult['insights'] } => {
    let score = 0
    // Each insight carries its own wording. Deriving the body from the heading
    // reads as "identified multiple high-risk factors identified", because the
    // heading is already a full sentence rather than a noun phrase.
    const insights: AssessmentResult['insights'] = []
    
    answers.forEach((answer, index) => {
      if (category === 'children') {
        if (index === 0) { // Primary concern
          if (answer.answer === 'Multiple concerns') score += 3
          else if (answer.answer === 'Behavioral or social challenges') score += 2
          else if (answer.answer === 'Developmental milestones or delays') score += 2
          else score += 1
        } else if (index === 2) { // Symptoms (multiple choice)
          const symptomCount = Array.isArray(answer.answer) ? answer.answer.length : 0
          if (symptomCount >= 5) score += 3
          else if (symptomCount >= 3) score += 2
          else if (symptomCount >= 1) score += 1
        } else if (index === 3) { // Duration
          if (answer.answer === 'More than 2 years') score += 2
          else if (answer.answer === '1-2 years') score += 1
        }
      } else if (category === 'hormones') {
        if (index === 0) { // Primary concern
          if (answer.answer === 'Multiple hormonal concerns') score += 3
          else if (answer.answer === 'Thyroid concerns') score += 2
          else score += 1
        } else if (index === 1 && typeof answer.answer === 'object' && 'value' in answer.answer) { // Energy scale
          if ((answer.answer as { value: number; label: string }).value <= 2) score += 2
          else if ((answer.answer as { value: number; label: string }).value <= 3) score += 1
        } else if (index === 2) { // Symptoms
          const symptomCount = Array.isArray(answer.answer) ? answer.answer.length : 0
          if (symptomCount >= 6) score += 3
          else if (symptomCount >= 4) score += 2
          else if (symptomCount >= 2) score += 1
        } else if (index === 3) { // Duration
          if (answer.answer === 'More than 3 years') score += 2
          else if (answer.answer === '1-3 years') score += 1
        }
      } else if (category === 'heart') {
        if (index === 0) { // Primary concern
          if (answer.answer === 'Previous stroke or stroke risk') score += 3
          else if (answer.answer === 'High blood pressure or hypertension') score += 2
          else score += 1
        } else if (index === 1) { // Family history
          if (answer.answer === 'Yes, parent or sibling diagnosed before age 55') score += 3
          else if (answer.answer === 'Yes, diagnosed after age 55') score += 2
          else if (answer.answer === 'Yes, in extended family') score += 1
        } else if (index === 2) { // Symptoms
          const symptomCount = Array.isArray(answer.answer) ? answer.answer.length : 0
          if (symptomCount >= 5) score += 3
          else if (symptomCount >= 3) score += 2
          else if (symptomCount >= 1) score += 1
        } else if (index === 3) { // Diet
          if (answer.answer === 'High in processed foods and sugar') score += 2
          else if (answer.answer === 'Moderate - mix of healthy and unhealthy') score += 1
        }
      } else if (category === 'cancer') {
        if (index === 0) { // Screening type
          if (answer.answer === 'Multiple cancer screenings') score += 2
          else score += 1
        } else if (index === 1) { // Family history
          if (answer.answer === 'Yes, immediate family') score += 3
          else if (answer.answer === 'Yes, extended family') score += 2
          else score += 0
        } else if (index === 2) { // Age
          if (answer.answer === '65+') score += 3
          else if (answer.answer === '50-64') score += 2
          else if (answer.answer === '40-49') score += 1
        } else if (index === 3) { // Last screening
          if (answer.answer === 'Never had screening') score += 2
          else if (answer.answer === 'More than 5 years ago') score += 1
        }
      }
    })
    
    // Generate insights based on score
    if (score >= 8) {
      insights.push({
        title: 'Multiple high-risk factors identified',
        text: 'Your answers point to several concerns that often occur together. Looking at them as a whole, rather than one at a time, gives the clearest picture of what is driving them.',
      })
      insights.push({
        title: 'Immediate medical evaluation recommended',
        text: 'Given how much your answers cover, we would encourage you to speak with a clinician soon rather than waiting for a routine check-up.',
      })
    } else if (score >= 5) {
      insights.push({
        title: 'Several risk factors present',
        text: 'Your answers flag more than one area worth examining. Concerns at this stage are usually easier to address now than once they have had time to settle in.',
      })
      insights.push({
        title: 'Preventive measures advised',
        text: 'Targeted testing and some adjustments to your daily routine can often keep these concerns from progressing.',
      })
    } else {
      insights.push({
        title: 'Low to moderate risk profile',
        text: 'Your answers do not point to a pressing concern. That is worth knowing, and worth keeping an eye on.',
      })
      insights.push({
        title: 'Continue regular monitoring',
        text: 'Periodic check-ups remain the best way to catch changes early, while they are still straightforward to manage.',
      })
    }
    
    const riskLevel = score >= 8 ? 'high' : score >= 5 ? 'moderate' : 'low'
    return { score, riskLevel, insights }
  }

  const completeAssessment = async (finalAnswers: Answer[]) => {
    setIsLoading(true)
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const { riskLevel, insights } = calculateRiskScore(finalAnswers, category)
    
    const result: AssessmentResult = {
      riskLevel,
      title: `${ASSESSMENTS[category].name} Assessment Complete`,
      summary: `Based on your responses to the ${ASSESSMENTS[category].name} questionnaire, your risk level is ${riskLevel}. ${riskLevel === 'high' ? 'We recommend scheduling a consultation as soon as possible.' : riskLevel === 'moderate' ? 'A consultation would help address your concerns proactively.' : 'Continue monitoring and consider periodic check-ups.'}`,
      insights,
      recommendations: `Schedule a consultation with our functional medicine experts to discuss your ${ASSESSMENTS[category].name} concerns and develop a personalized health plan.`
    }
    
    setResult(result)
    setIsLoading(false)
    setScreen('results')
  }

  const resetAssessment = () => {
    setScreen('welcome')
    setCategory('')
    setCurrentQuestion(0)
    setAnswers([])
    setSelectedAnswers([])
    setResult(null)
  }

  const bookConsultation = (type: 'telemedicine' | 'home-visit') => {
    setBookingType(type)
    setShowBookingModal(true)
  }

  const getProgress = () => {
    if (!category) return 0
    const assessment = ASSESSMENTS[category]
    return ((currentQuestion + 1) / assessment.questions.length) * 100
  }

  return (
    <>
      {screen === 'welcome' && (
        <section id="quiz" className="bg-white py-[90px] px-[5%]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-semibold tracking-[0.14em] uppercase mb-4">
                Health Assessment
              </div>
              <Heading className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
                A 3-minute assessment could discover <span className="italic bg-[#CADE68] px-2 rounded">risk</span><br/>before they become <span className="italic bg-[#CADE68] px-2 rounded">diagnosis</span>
              </Heading>
              <p className="font-dm-sans text-black text-[1.05rem] leading-[1.7] max-w-[560px] mx-auto">
                Take our comprehensive health assessment to get personalized insights and actionable recommendations from our functional medicine experts.
              </p>
            </div>

            <div className="max-w-4xl mx-auto bg-[#FCFFF0] rounded-[24px] p-8 md:p-12">
              <div className="text-center mb-10">
                <p className="font-dm-sans font-bold text-text-mid text-[1.3rem] leading-[1.7] max-w-3xl mx-auto">
                  Choose an area to get started
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => startAssessment(cat.id)}
                    className="bg-white border-2 border-green-deep/20 rounded-[16px] p-6 text-left hover:border-green-mid hover:shadow-lg transition-all group"
                  >
                    <div className="text-4xl mb-4">
                      {cat.icon.startsWith('/') ? (
                        <Image src={cat.icon} alt={cat.title} width={48} height={48} />
                      ) : (
                        cat.icon
                      )}
                    </div>
                    <h3 className="font-dm-sans font-semibold text-green-deep text-[1.2rem] mb-2 group-hover:text-green-mid transition-colors">
                      {cat.title}
                    </h3>
                    <p className="font-dm-sans text-text-mid text-[0.95rem] leading-[1.5]">
                      {cat.subtitle}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === 'assessment' && isLoading && (
        <section id="quiz" className="bg-white py-[90px] px-[5%]">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-4xl mx-auto bg-[#FCFFF0] rounded-[24px] p-8 md:p-12">
              <div className="text-center py-12">
                <div className="flex justify-center mb-6">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-green-mid rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-3 h-3 bg-green-mid rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-3 h-3 bg-green-mid rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
                <h3 className="font-dm-sans font-semibold text-green-deep text-[1.5rem] mb-3">
                  Analyzing Your Responses
                </h3>
                <p className="font-dm-sans text-text-mid text-[1rem]">
                  Our health assistant is generating your personalized health assessment...
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === 'assessment' && !isLoading && (
        <section id="quiz" className="bg-white py-[90px] px-[5%]">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-4xl mx-auto bg-[#FCFFF0] rounded-[24px] p-8 md:p-12">
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-dm-sans text-text-mid text-sm">
                    Question {currentQuestion + 1} of {ASSESSMENTS[category].questions.length}
                  </span>
                  <span className="font-dm-sans text-green-deep text-sm font-medium">
                    {Math.round(getProgress())}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-mid to-gold transition-all duration-500"
                    style={{ width: `${getProgress()}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="font-dm-sans font-semibold text-green-deep text-[1.4rem] mb-6 leading-[1.4]">
                  {ASSESSMENTS[category].questions[currentQuestion].question}
                </h3>

                {ASSESSMENTS[category].questions[currentQuestion].type === 'single' && (
                  <div className="space-y-3">
                    {ASSESSMENTS[category].questions[currentQuestion].options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedAnswers([option])}
                        className={`w-full text-left p-4 rounded-[12px] border-2 transition-all ${
                          selectedAnswers[0] === option
                            ? 'border-green-mid bg-green-mid/10'
                            : 'border-gray-200 hover:border-green-deep/40 hover:bg-green-deep/5'
                        }`}
                      >
                        <span className="font-dm-sans text-text-mid">{option}</span>
                      </button>
                    ))}
                  </div>
                )}

                {ASSESSMENTS[category].questions[currentQuestion].type === 'multiple' && (
                  <div className="space-y-3">
                    {ASSESSMENTS[category].questions[currentQuestion].options.map((option, index) => (
                      <label
                        key={index}
                        className={`flex items-center p-4 rounded-[12px] border-2 cursor-pointer transition-all ${
                          selectedAnswers.includes(option)
                            ? 'border-green-mid bg-green-mid/10'
                            : 'border-gray-200 hover:border-green-deep/40 hover:bg-green-deep/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAnswers.includes(option)}
                          onChange={() => handleAnswerSelect(option)}
                          className="w-5 h-5 text-green-deep rounded focus:ring-green-deep focus:ring-2 mr-3 accent-green-deep"
                        />
                        <span className="font-dm-sans text-text-mid">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {ASSESSMENTS[category].questions[currentQuestion].type === 'scale' && (
                  <div className="flex flex-wrap gap-3">
                    {ASSESSMENTS[category].questions[currentQuestion].options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedAnswers([option])}
                        className={`px-6 py-3 rounded-[12px] border-2 transition-all ${
                          selectedAnswers[0] === option
                            ? 'border-green-mid bg-green-mid text-white'
                            : 'border-gray-200 hover:border-green-deep/40 hover:bg-green-deep/5'
                        }`}
                      >
                        <span className="font-dm-sans font-medium">{option}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={backQuestion}
                  className="px-6 py-3 rounded-[12px] border-2 border-gray-200 font-dm-sans font-medium transition-all hover:border-gray-300"
                >
                  ← Previous
                </button>

                <button
                  onClick={nextQuestion}
                  disabled={selectedAnswers.length === 0}
                  className="px-8 py-3 rounded-[12px] bg-gold text-green-deep font-dm-sans font-semibold transition-all hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {currentQuestion === ASSESSMENTS[category].questions.length - 1 ? 'Get Results' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === 'results' && result && (
        <section id="quiz" className="bg-white py-[90px] px-[5%]">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-green-deep/10 to-gold/10 border-2 border-green-mid rounded-[24px] p-8 md:p-12 mb-8">
                <div className="text-center mb-8">
                  <div className={`inline-block px-4 py-1.5 rounded-[16px] font-dm-sans font-semibold text-sm mb-4 ${
                    result.riskLevel === 'low' ? 'bg-green-deep/10 text-green-deep' :
                    result.riskLevel === 'moderate' ? 'bg-gold/20 text-gold' :
                    'bg-red-500/20 text-red-500'
                  }`}>
                    {result.riskLevel.toUpperCase()} RISK
                  </div>
                  <h2 className="font-dm-sans font-bold text-green-deep text-[2rem] mb-4">
                    {result.title}
                  </h2>
                  <p className="font-dm-sans text-text-mid text-[1.1rem] leading-[1.7] max-w-3xl mx-auto">
                    {result.summary}
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  {result.insights.map((insight, index) => (
                    <div key={index} className="bg-white/60 border-l-4 border-green-mid rounded-[12px] p-6">
                      <h4 className="font-dm-sans font-semibold text-green-deep text-[1.1rem] mb-2">
                        {insight.title}
                      </h4>
                      <p className="font-dm-sans text-text-mid text-[1rem] leading-[1.6]">
                        {insight.text}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="bg-white/60 rounded-[12px] p-6">
                  <p className="font-dm-sans text-text-mid text-[1rem] leading-[1.6]">
                    <span className="font-semibold text-green-deep">Next Steps:</span> {result.recommendations}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-deep to-green-mid rounded-[24px] p-8 md:p-12 text-center text-white">
                <h2 className="font-dm-sans font-bold text-[2rem] mb-4">
                  Ready to Take Control of Your Health?
                </h2>
                <p className="font-dm-sans text-white/90 text-[1.1rem] mb-8 max-w-2xl mx-auto">
                  Book a consultation with our concierge functional health experts
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white/10 backdrop-blur rounded-[16px] p-6 border border-white/20">
                    <div className="text-3xl mb-3">
                      <Image src="/Telemedicine.png" alt="Telemedicine" width={48} height={48} className="mx-auto" />
                    </div>
                    <h3 className="font-dm-sans font-semibold text-lg mb-2">Telemedicine</h3>
                    <p className="font-dm-sans text-white/80 text-sm mb-4">WhatsApp Video or Google Meet</p>
                    <div className="text-2xl font-bold mb-1">₦25,000</div>
                    <p className="font-dm-sans text-white/60 text-sm mb-4">Per consultation</p>
                    <button
                      onClick={() => bookConsultation('telemedicine')}
                      className="w-full bg-white text-green-deep px-6 py-3 rounded-[12px] font-dm-sans font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Book Telemedicine
                    </button>
                  </div>

                  <div className="bg-white/10 backdrop-blur rounded-[16px] p-6 border border-gold/40 relative">
                    <div className="absolute -top-3 right-6 bg-gold text-green-deep px-3 py-1 rounded-[20px] text-xs font-bold">
                      PREMIUM
                    </div>
                    <div className="text-3xl mb-3">
                      <Image src="/HomeVisit.png" alt="Home Visit" width={48} height={48} className="mx-auto" />
                    </div>
                    <h3 className="font-dm-sans font-semibold text-lg mb-2">Home Visit</h3>
                    <p className="font-dm-sans text-white/80 text-sm mb-4">Mobile clinic comes to you</p>
                    <div className="text-2xl font-bold mb-1">₦85,000</div>
                    <p className="font-dm-sans text-white/60 text-sm mb-1">Lagos only</p>
                    <p className="font-dm-sans text-white/50 text-xs italic mb-4">Call for out-of-state pricing</p>
                    <button
                      onClick={() => bookConsultation('home-visit')}
                      className="w-full bg-gold text-green-deep px-6 py-3 rounded-[12px] font-dm-sans font-bold hover:bg-gold-light transition-colors"
                    >
                      Book Home Visit
                    </button>
                  </div>
                </div>

                <p className="font-dm-sans text-white/80 text-sm italic">
                  Limited slots available - New patients booking 2-3 weeks out
                </p>
              </div>

              <div className="text-center mt-8">
                <button
                  onClick={resetAssessment}
                  className="text-green-mid hover:text-green-deep font-dm-sans font-medium transition-colors"
                >
                  ← Take Another Assessment
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Booking Modal */}
      <BookingModal 
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        consultationType={bookingType}
      />
    </>
  )
}
