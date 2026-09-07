'use client'

import { useState } from 'react'
import { ageFromDateOfBirth, isPlausibleDateOfBirth } from '@/lib/age'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

interface FormData {
  personalInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
    dateOfBirth: string
    gender: string
  }
  healthConcerns: {
    primaryConcern: string
    symptoms: string[]
    duration: string
    severity: string
  }
  lifestyle: {
    diet: string
    exercise: string
    sleep: string
    stress: string
  }
  medicalHistory: {
    medications: string
    supplements: string
    conditions: string
    surgeries: string
  }
  goals: {
    primaryGoal: string
    timeline: string
    expectations: string
  }
}

export default function FunctionalHealthAnalysisForm() {
  const [currentSection, setCurrentSection] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [formData, setFormData] = useState<FormData>({
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: ''
    },
    healthConcerns: {
      primaryConcern: '',
      symptoms: [],
      duration: '',
      severity: ''
    },
    lifestyle: {
      diet: '',
      exercise: '',
      sleep: '',
      stress: ''
    },
    medicalHistory: {
      medications: '',
      supplements: '',
      conditions: '',
      surgeries: ''
    },
    goals: {
      primaryGoal: '',
      timeline: '',
      expectations: ''
    }
  })

  const age = ageFromDateOfBirth(formData.personalInfo.dateOfBirth)

  const sections = [
    { id: 'personal', title: 'Personal Information', description: 'Tell us about yourself' },
    { id: 'concerns', title: 'Health Concerns', description: 'What brings you to us today?' },
    { id: 'lifestyle', title: 'Lifestyle', description: 'Your daily habits and routines' },
    { id: 'history', title: 'Medical History', description: 'Your health background' },
    { id: 'goals', title: 'Health Goals', description: 'What do you want to achieve?' }
  ]

  const symptoms = [
    'Fatigue/Low Energy', 'Digestive Issues', 'Hormonal Imbalance', 'Thyroid Issues',
    'Weight Management', 'Sleep Problems', 'Stress/Anxiety', 'Brain Fog',
    'Hair Loss', 'Skin Issues', 'Joint Pain', 'Headaches/Migraines'
  ]

  const handleInputChange = (section: keyof FormData, field: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const handleSymptomToggle = (symptom: string) => {
    const currentSymptoms = formData.healthConcerns.symptoms
    if (currentSymptoms.includes(symptom)) {
      handleInputChange('healthConcerns', 'symptoms', currentSymptoms.filter(s => s !== symptom))
    } else {
      handleInputChange('healthConcerns', 'symptoms', [...currentSymptoms, symptom])
    }
  }

  const nextSection = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1)
    }
  }

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1)
    } else {
      // Navigate back to previous page when on first section
      window.history.back()
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')
    const response = await fetch('/api/health-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setSubmitError(result.error || 'We could not save your assessment. Please try again.')
      setSubmitting(false)
      return
    }
    sessionStorage.setItem('fxmed-health-analysis', JSON.stringify(formData))
    window.location.href = `/functional-health-analysis/investigations?assessment=${encodeURIComponent(result.id)}`
  }

  const validateSection = () => {
    switch (sections[currentSection].id) {
      case 'personal':
        return formData.personalInfo.firstName && 
               formData.personalInfo.lastName && 
               formData.personalInfo.email && 
               formData.personalInfo.phone &&
               isPlausibleDateOfBirth(formData.personalInfo.dateOfBirth) &&
               formData.personalInfo.gender
      case 'concerns':
        return formData.healthConcerns.primaryConcern && 
               formData.healthConcerns.symptoms.length > 0 &&
               formData.healthConcerns.duration &&
               formData.healthConcerns.severity
      case 'lifestyle':
        return formData.lifestyle.diet && 
               formData.lifestyle.exercise && 
               formData.lifestyle.sleep && 
               formData.lifestyle.stress
      case 'history':
        return true // Medical history is optional
      case 'goals':
        return formData.goals.primaryGoal && 
               formData.goals.timeline && 
               formData.goals.expectations
      default:
        return false
    }
  }

  const renderSection = () => {
    const section = sections[currentSection]

    switch (section.id) {
      case 'personal':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-dm-sans font-medium text-green-deep mb-2">First Name *</label>
                <input
                  type="text"
                  value={formData.personalInfo.firstName}
                  onChange={(e) => handleInputChange('personalInfo', 'firstName', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  placeholder="Enter your first name"
                />
              </div>
              <div>
                <label className="block font-dm-sans font-medium text-green-deep mb-2">Last Name *</label>
                <input
                  type="text"
                  value={formData.personalInfo.lastName}
                  onChange={(e) => handleInputChange('personalInfo', 'lastName', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-dm-sans font-medium text-green-deep mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.personalInfo.email}
                  onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  placeholder="your.email@example.com"
                />
              </div>
              <div>
                <label className="block font-dm-sans font-medium text-green-deep mb-2">Phone *</label>
                <input
                  type="tel"
                  value={formData.personalInfo.phone}
                  onChange={(e) => handleInputChange('personalInfo', 'phone', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  placeholder="+234 800 000 0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-dm-sans font-medium text-green-deep mb-2">Date of birth *</label>
                <input
                  type="date"
                  value={formData.personalInfo.dateOfBirth}
                  onChange={(e) => handleInputChange('personalInfo', 'dateOfBirth', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  max={new Date().toISOString().slice(0, 10)}
                  autoComplete="bday"
                />
                {age !== null && (
                  <p className="mt-1 font-dm-sans text-sm text-text-mid">{age} years old</p>
                )}
              </div>
              <div>
                <label className="block font-dm-sans font-medium text-green-deep mb-2">Gender *</label>
                <select
                  value={formData.personalInfo.gender}
                  onChange={(e) => handleInputChange('personalInfo', 'gender', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>
        )

      case 'concerns':
        return (
          <div className="space-y-6">
            <div>
              <label className="block font-dm-sans font-medium text-green-deep mb-2">Primary Health Concern *</label>
              <textarea
                value={formData.healthConcerns.primaryConcern}
                onChange={(e) => handleInputChange('healthConcerns', 'primaryConcern', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                rows={3}
                placeholder="Describe your main health concern..."
              />
            </div>

            <div>
              <label className="block font-dm-sans font-medium text-green-deep mb-2">Symptoms (Select all that apply) *</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {symptoms.map((symptom) => (
                  <label key={symptom} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.healthConcerns.symptoms.includes(symptom)}
                      onChange={() => handleSymptomToggle(symptom)}
                      className="w-4 h-4 text-green-deep rounded focus:ring-green-deep focus:ring-2"
                    />
                    <span className="text-sm font-dm-sans">{symptom}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-dm-sans font-medium text-green-deep mb-2">Duration *</label>
                <select
                  value={formData.healthConcerns.duration}
                  onChange={(e) => handleInputChange('healthConcerns', 'duration', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                >
                  <option value="">Select duration</option>
                  <option value="less-than-1-month">Less than 1 month</option>
                  <option value="1-3-months">1-3 months</option>
                  <option value="3-6-months">3-6 months</option>
                  <option value="6-months-1-year">6 months - 1 year</option>
                  <option value="more-than-1-year">More than 1 year</option>
                </select>
              </div>
              <div>
                <label className="block font-dm-sans font-medium text-green-deep mb-2">Severity *</label>
                <select
                  value={formData.healthConcerns.severity}
                  onChange={(e) => handleInputChange('healthConcerns', 'severity', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                >
                  <option value="">Select severity</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="very-severe">Very Severe</option>
                </select>
              </div>
            </div>
          </div>
        )

      case 'lifestyle':
        return (
          <div className="space-y-6">
            {/* Dietary Habits */}
            <div>
              <label className="block font-dm-sans font-medium text-green-deep mb-3">Dietary Habits *</label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  'Regular meals (3x daily)',
                  'Irregular eating patterns',
                  'High processed foods',
                  'Mostly whole foods',
                  'Vegetarian/Vegan',
                  'Low carb diet',
                  'High protein diet',
                  'Frequent snacking',
                  'Gluten-free',
                  'Dairy-free',
                  'Organic foods',
                  'Takeout/Restaurant meals'
                ].map((habit) => (
                  <label key={habit} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-green-mid border-gray-300 rounded focus:ring-green-mid"
                      onChange={(e) => {
                        const currentDiet = formData.lifestyle.diet.split(', ').filter(s => s.trim())
                        if (e.target.checked) {
                          currentDiet.push(habit)
                        } else {
                          const index = currentDiet.indexOf(habit)
                          if (index > -1) currentDiet.splice(index, 1)
                        }
                        handleInputChange('lifestyle', 'diet', currentDiet.filter(s => s.trim()).join(', '))
                      }}
                    />
                    <span className="text-sm text-gray-700">{habit}</span>
                  </label>
                ))}
              </div>
              <textarea
                value={formData.lifestyle.diet}
                onChange={(e) => handleInputChange('lifestyle', 'diet', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                rows={2}
                placeholder="Additional dietary details..."
              />
            </div>

            {/* Exercise Routine */}
            <div>
              <label className="block font-dm-sans font-medium text-green-deep mb-3">Exercise Routine *</label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  'Daily exercise',
                  '3-4 times per week',
                  '1-2 times per week',
                  'Rarely/Never exercise',
                  'Cardio workouts',
                  'Strength training',
                  'Walking/Jogging',
                  'Sports activities',
                  'Home workouts',
                  'No regular routine'
                ].map((routine) => (
                  <label key={routine} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-green-mid border-gray-300 rounded focus:ring-green-mid"
                      onChange={(e) => {
                        const currentExercise = formData.lifestyle.exercise.split(', ').filter(s => s.trim())
                        if (e.target.checked) {
                          currentExercise.push(routine)
                        } else {
                          const index = currentExercise.indexOf(routine)
                          if (index > -1) currentExercise.splice(index, 1)
                        }
                        handleInputChange('lifestyle', 'exercise', currentExercise.filter(s => s.trim()).join(', '))
                      }}
                    />
                    <span className="text-sm text-gray-700">{routine}</span>
                  </label>
                ))}
              </div>
              <textarea
                value={formData.lifestyle.exercise}
                onChange={(e) => handleInputChange('lifestyle', 'exercise', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                rows={2}
                placeholder="Additional exercise details..."
              />
            </div>

            {/* Sleep Patterns */}
            <div>
              <label className="block font-dm-sans font-medium text-green-deep mb-3">Sleep Patterns *</label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  '7-8 hours nightly',
                  'Less than 6 hours',
                  'More than 9 hours',
                  'Irregular sleep schedule',
                  'Difficulty falling asleep',
                  'Frequent night waking',
                  'Early morning awakening',
                  'Good sleep quality',
                  'Poor sleep quality',
                  'Use sleep aids',
                  'No screen time before bed',
                  'Regular bedtime routine'
                ].map((pattern) => (
                  <label key={pattern} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-green-mid border-gray-300 rounded focus:ring-green-mid"
                      onChange={(e) => {
                        const currentSleep = formData.lifestyle.sleep.split(', ').filter(s => s.trim())
                        if (e.target.checked) {
                          currentSleep.push(pattern)
                        } else {
                          const index = currentSleep.indexOf(pattern)
                          if (index > -1) currentSleep.splice(index, 1)
                        }
                        handleInputChange('lifestyle', 'sleep', currentSleep.filter(s => s.trim()).join(', '))
                      }}
                    />
                    <span className="text-sm text-gray-700">{pattern}</span>
                  </label>
                ))}
              </div>
              <textarea
                value={formData.lifestyle.sleep}
                onChange={(e) => handleInputChange('lifestyle', 'sleep', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                rows={2}
                placeholder="Additional sleep details..."
              />
            </div>

            {/* Stress Levels */}
            <div>
              <label className="block font-dm-sans font-medium text-green-deep mb-3">Stress Levels *</label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  'High stress levels',
                  'Moderate stress',
                  'Low stress',
                  'Work-related stress',
                  'Financial stress',
                  'Family stress',
                  'Health-related stress',
                  'Good stress management'
                ].map((level) => (
                  <label key={level} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-green-mid border-gray-300 rounded focus:ring-green-mid"
                      onChange={(e) => {
                        const currentStress = formData.lifestyle.stress.split(', ').filter(s => s.trim())
                        if (e.target.checked) {
                          currentStress.push(level)
                        } else {
                          const index = currentStress.indexOf(level)
                          if (index > -1) currentStress.splice(index, 1)
                        }
                        handleInputChange('lifestyle', 'stress', currentStress.filter(s => s.trim()).join(', '))
                      }}
                    />
                    <span className="text-sm text-gray-700">{level}</span>
                  </label>
                ))}
              </div>
              <textarea
                value={formData.lifestyle.stress}
                onChange={(e) => handleInputChange('lifestyle', 'stress', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                rows={2}
                placeholder="Additional stress details..."
              />
            </div>
          </div>
        )

      case 'history':
        return (
          <div className="space-y-6">
            <div>
              <label className="block font-dm-sans font-medium text-green-deep mb-2">Current Medications</label>
              <textarea
                value={formData.medicalHistory.medications}
                onChange={(e) => handleInputChange('medicalHistory', 'medications', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                rows={3}
                placeholder="List any current medications you're taking (optional)"
              />
            </div>

            <div>
              <label className="block font-dm-sans font-medium text-green-deep mb-2">Supplements</label>
              <textarea
                value={formData.medicalHistory.supplements}
                onChange={(e) => handleInputChange('medicalHistory', 'supplements', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                rows={3}
                placeholder="List any supplements or vitamins you're taking (optional)"
              />
            </div>

            <div>
              <label className="block font-dm-sans font-medium text-green-deep mb-2">Medical Conditions</label>
              <textarea
                value={formData.medicalHistory.conditions}
                onChange={(e) => handleInputChange('medicalHistory', 'conditions', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                rows={3}
                placeholder="List any diagnosed medical conditions (optional)"
              />
            </div>

            <div>
              <label className="block font-dm-sans font-medium text-green-deep mb-2">Previous Surgeries</label>
              <textarea
                value={formData.medicalHistory.surgeries}
                onChange={(e) => handleInputChange('medicalHistory', 'surgeries', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                rows={3}
                placeholder="List any previous surgeries (optional)"
              />
            </div>
          </div>
        )

      case 'goals':
        return (
          <div className="space-y-6">
            <div>
              <label className="block font-dm-sans font-medium text-green-deep mb-3">Primary Health Goal *</label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  'Improve energy levels',
                  'Lose weight',
                  'Gain muscle/mass',
                  'Better sleep quality',
                  'Reduce stress/anxiety',
                  'Improve digestion',
                  'Hormonal balance',
                  'Better skin health',
                  'Pain management',
                  'Boost immune system',
                  'Improve mental clarity',
                  'Manage chronic condition'
                ].map((goal) => (
                  <label key={goal} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-green-mid border-gray-300 rounded focus:ring-green-mid"
                      onChange={(e) => {
                        const currentGoals = formData.goals.primaryGoal.split(', ').filter(s => s.trim())
                        if (e.target.checked) {
                          currentGoals.push(goal)
                        } else {
                          const index = currentGoals.indexOf(goal)
                          if (index > -1) currentGoals.splice(index, 1)
                        }
                        handleInputChange('goals', 'primaryGoal', currentGoals.filter(s => s.trim()).join(', '))
                      }}
                    />
                    <span className="text-sm text-gray-700">{goal}</span>
                  </label>
                ))}
              </div>
              <textarea
                value={formData.goals.primaryGoal}
                onChange={(e) => handleInputChange('goals', 'primaryGoal', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                rows={2}
                placeholder="Other health goals or additional details..."
              />
            </div>

            <div>
              <label className="block font-dm-sans font-medium text-green-deep mb-2">Timeline *</label>
              <select
                value={formData.goals.timeline}
                onChange={(e) => handleInputChange('goals', 'timeline', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
              >
                <option value="">Select timeline</option>
                <option value="1-month">1 month</option>
                <option value="3-months">3 months</option>
                <option value="6-months">6 months</option>
                <option value="1-year">1 year</option>
                <option value="long-term">Long term</option>
              </select>
            </div>

            <div>
              <label className="block font-dm-sans font-medium text-green-deep mb-2">Expectations *</label>
              <textarea
                value={formData.goals.expectations}
                onChange={(e) => handleInputChange('goals', 'expectations', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                rows={3}
                placeholder="What do you expect from working with FXMed?"
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#FCFFF0]">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-[5%] pt-48 pb-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="font-dm-sans font-bold text-green-deep text-2xl">
              Functional Health Analysis
            </h1>
            <span className="text-sm font-dm-sans text-text-mid">
              Step {currentSection + 1} of {sections.length}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-mid to-gold transition-all duration-500"
              style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Section Content */}
        <div className="bg-white rounded-[24px] p-8 shadow-lg mb-8">
          <div className="mb-8">
            <h2 className="font-dm-sans font-bold text-green-deep text-xl mb-2">
              {sections[currentSection].title}
            </h2>
            <p className="font-dm-sans text-text-mid">
              {sections[currentSection].description}
            </p>
          </div>

          {renderSection()}
          {submitError && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p>}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={prevSection}
            className="px-6 py-3 rounded-lg border border-green-deep/20 font-dm-sans font-medium transition-all hover:border-green-deep/40"
          >
            Previous
          </button>

          {currentSection === sections.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={!validateSection() || submitting}
              className="px-8 py-3 rounded-lg bg-green-deep text-white font-dm-sans font-semibold transition-all hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Submit Request'}
            </button>
          ) : (
            <button
              onClick={nextSection}
              disabled={!validateSection()}
              className="px-8 py-3 rounded-lg bg-green-deep text-white font-dm-sans font-semibold transition-all hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
