'use client'

import { useState } from 'react'
import { Icon, SectionHeading } from '@/components/AutismSupportInfographics'

// A short, non-diagnostic development check. Questions are original wording based on
// widely published developmental signs (CDC/AAP), not a validated screening tool, so
// results only ever suggest whether to talk to a professional. Answers never leave the
// browser.

type Answer = 'yes' | 'sometimes' | 'no'

type Question = {
  text: string
  // The answer that suggests a sign worth mentioning to a professional
  concernIf: 'yes' | 'no'
  // How the sign reads on the summary a parent can take to their doctor
  sign: string
  // Loss of skills always warrants prompt attention, whatever else is answered
  urgent?: boolean
}

const tracks: Record<'toddler' | 'child', { label: string; ages: string; questions: Question[] }> = {
  toddler: {
    label: 'Toddler',
    ages: '12 months to 3 years',
    questions: [
      { text: 'Does your child point to show you something interesting, like a plane in the sky?', concernIf: 'no', sign: 'Rarely points to share interest' },
      { text: 'Does your child respond when you call their name?', concernIf: 'no', sign: 'Often does not respond to their name' },
      { text: 'Does your child look at your face and share smiles with you?', concernIf: 'no', sign: 'Few shared looks or smiles' },
      { text: 'Does your child bring things to show you, just to share them?', concernIf: 'no', sign: 'Rarely brings things to show you' },
      { text: 'Does your child copy what you do, like waving or clapping?', concernIf: 'no', sign: 'Rarely copies actions such as waving' },
      { text: 'Does your child play pretend, like feeding a doll or talking on a toy phone?', concernIf: 'no', sign: 'Little pretend play' },
      { text: 'Is your child using words, or two-word phrases by age 2, to communicate?', concernIf: 'no', sign: 'Fewer words than expected for age' },
      { text: 'Does your child repeat movements over and over, like flapping, spinning or rocking?', concernIf: 'yes', sign: 'Repeated movements such as flapping or spinning' },
      { text: 'Does your child get very upset by small changes in routine?', concernIf: 'yes', sign: 'Strong distress at small changes' },
      { text: 'Does your child react very strongly to sounds, textures, lights or smells?', concernIf: 'yes', sign: 'Strong reactions to sounds, textures or lights' },
      { text: 'Has your child lost words or skills they used to have?', concernIf: 'yes', sign: 'Has lost words or skills', urgent: true },
    ],
  },
  child: {
    label: 'Child',
    ages: '3 to 12 years',
    questions: [
      { text: 'Does your child find it hard to make or keep friends their age?', concernIf: 'yes', sign: 'Difficulty making or keeping friends' },
      { text: 'Does your child find back-and-forth conversation difficult?', concernIf: 'yes', sign: 'Finds back-and-forth conversation hard' },
      { text: 'Does your child find it hard to read facial expressions, gestures or tone of voice?', concernIf: 'yes', sign: 'Finds facial expressions or tone hard to read' },
      { text: 'Does your child take words very literally, or miss jokes and sarcasm?', concernIf: 'yes', sign: 'Takes language very literally' },
      { text: 'Does your child have very intense interests that take up much of their time?', concernIf: 'yes', sign: 'Very intense, focused interests' },
      { text: 'Does your child need things done the same way and get very upset by change?', concernIf: 'yes', sign: 'Strong need for sameness and routine' },
      { text: 'Does your child repeat movements, words or phrases, for example from shows?', concernIf: 'yes', sign: 'Repeats movements, words or phrases' },
      { text: 'Does your child react very strongly to sounds, textures, lights or smells?', concernIf: 'yes', sign: 'Strong reactions to sounds, textures or lights' },
      { text: 'Does your child eat only a very small range of foods?', concernIf: 'yes', sign: 'Eats a very small range of foods' },
      { text: 'Has your child lost words or skills they used to have?', concernIf: 'yes', sign: 'Has lost words or skills', urgent: true },
    ],
  },
}

const answerOptions: { value: Answer; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'no', label: 'No' },
]

function isSign(question: Question, answer: Answer) {
  // "Sometimes" counts, since an inconsistent skill is still worth mentioning
  return answer === 'sometimes' || answer === question.concernIf
}

export default function AutismDevelopmentCheck({ onBook }: { onBook: () => void }) {
  const [track, setTrack] = useState<'toddler' | 'child' | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])

  const questions = track ? tracks[track].questions : []
  const finished = track !== null && answers.length === questions.length
  const current = questions[answers.length]

  // Records an answer for question `index` only, so a double tap cannot skip a question
  const answer = (index: number, value: Answer) => {
    setAnswers((prev) => (prev.length === index ? [...prev, value] : prev))
  }

  // Print only this section, not the whole program page
  const printSummary = () => {
    document.body.classList.add('print-dev-check')
    window.print()
    document.body.classList.remove('print-dev-check')
  }

  const restart = () => {
    setTrack(null)
    setAnswers([])
  }

  const signs = finished ? questions.filter((q, i) => isSign(q, answers[i])) : []
  const urgent = finished && questions.some((q, i) => q.urgent && isSign(q, answers[i]))
  const result = urgent
    ? { tone: 'bg-[#fff4ea] border-[#e8833a]', title: 'Please speak to a doctor soon', text: 'You mentioned your child has lost words or skills. Loss of skills is never a normal part of development and should be checked promptly, whatever the cause.' }
    : signs.length >= 4
      ? { tone: 'bg-gold/20 border-gold', title: 'It’s worth talking to a professional', text: 'You noticed several signs that are worth discussing with your paediatrician or a developmental specialist. This is not a diagnosis, but an assessment can give you clear answers and access to support.' }
      : signs.length >= 2
        ? { tone: 'bg-gold/20 border-gold', title: 'Consider raising this at your next visit', text: 'You noticed a few signs. Many children show some of these and are not autistic, but if you are unsure, it is always better to ask than to wait and see.' }
        : { tone: 'bg-green-light/15 border-green-light', title: 'Few signs noticed today', text: 'You noticed few or none of these signs. Keep watching your child’s development, and trust your instincts: if you have a concern, talk to a professional.' }

  return (
    <section id="development-check" className="py-20 px-[5%] bg-white scroll-mt-28">
      <div className="max-w-3xl mx-auto">
        <SectionHeading
          eyebrow="2-minute development check"
          title="Is it time to talk to someone?"
          intro="Answer a few quick questions about your child. This is not a diagnosis. It helps you notice signs that are worth discussing with a professional."
        />

        <div className="bg-[#FCFFF0] rounded-3xl border border-green-deep/10 shadow-lg p-6 md:p-10 print:shadow-none">
          {!track && (
            <div>
              <p className="font-dm-sans font-semibold text-lg text-green-deep text-center mb-6">How old is your child?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(Object.keys(tracks) as Array<keyof typeof tracks>).map((key) => (
                  <button
                    key={key}
                    onClick={() => setTrack(key)}
                    className="group text-left bg-white rounded-2xl border-2 border-green-deep/10 p-6 transition-all hover:border-gold hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gold"
                  >
                    <span className="block font-dm-sans font-bold text-xl text-green-deep mb-1">{tracks[key].label}</span>
                    <span className="block font-dm-sans text-text-mid">{tracks[key].ages}</span>
                    <span className="block font-dm-sans text-sm text-green-mid font-semibold mt-3">{tracks[key].questions.length} questions →</span>
                  </button>
                ))}
              </div>
              <p className="font-dm-sans text-xs text-text-mid text-center mt-6 flex items-center justify-center gap-1.5">
                <Icon name="shield" className="w-4 h-4 text-green-mid" />
                Your answers stay on this device. Nothing is sent or saved.
              </p>
            </div>
          )}

          {track && !finished && current && (
            <div>
              <div className="flex items-center justify-between font-dm-sans text-sm text-text-mid mb-2">
                <span>Question {answers.length + 1} of {questions.length}</span>
                <button onClick={restart} className="text-green-mid font-semibold hover:underline">Start over</button>
              </div>
              <div className="h-2 rounded-full bg-green-deep/10 overflow-hidden mb-8" aria-hidden="true">
                <div className="h-full rounded-full bg-gradient-to-r from-green-mid to-gold transition-all duration-300" style={{ width: `${(answers.length / questions.length) * 100}%` }} />
              </div>
              <p className="font-dm-sans font-semibold text-xl md:text-2xl text-green-deep leading-[1.35] mb-8 min-h-[4.5rem]" aria-live="polite">
                {current.text}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {answerOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => answer(answers.length, option.value)}
                    className="font-dm-sans font-semibold text-lg bg-white text-green-deep border-2 border-green-deep/15 rounded-2xl py-4 transition-all hover:bg-green-deep hover:text-white hover:border-green-deep focus:outline-none focus:ring-2 focus:ring-gold"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {answers.length > 0 && (
                <button onClick={() => setAnswers(answers.slice(0, -1))} className="font-dm-sans text-sm text-text-mid mt-6 hover:text-green-deep">
                  ← Back
                </button>
              )}
            </div>
          )}

          {finished && (
            <div>
              <div className={`rounded-2xl border-l-4 p-6 mb-8 ${result.tone}`}>
                <p className="font-dm-sans font-bold text-xl text-green-deep mb-2">{result.title}</p>
                <p className="font-dm-sans text-text-dark leading-[1.65]">{result.text}</p>
              </div>

              {signs.length > 0 && (
                <div className="mb-8">
                  <p className="font-dm-sans font-semibold text-green-deep mb-3">
                    Signs you noticed ({signs.length} of {questions.length}). Take this list to your appointment:
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {signs.map((q) => (
                      <li key={q.sign} className={`flex items-start gap-2 font-dm-sans text-sm rounded-xl px-3 py-2.5 ${q.urgent ? 'bg-[#fff4ea] text-[#a14b0e] font-semibold' : 'bg-white text-text-dark border border-green-deep/10'}`}>
                        <Icon name="check" className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-mid" />
                        {q.sign}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 print:hidden">
                <button
                  onClick={onBook}
                  className="font-dm-sans bg-green-deep text-white px-6 py-3.5 rounded-[50px] font-semibold transition-all hover:bg-green-mid"
                >
                  Book a consultation
                </button>
                <button
                  onClick={printSummary}
                  className="font-dm-sans bg-white text-green-deep border-2 border-green-deep/15 px-6 py-3.5 rounded-[50px] font-semibold transition-all hover:border-green-deep"
                >
                  Print or save summary
                </button>
                <button onClick={restart} className="font-dm-sans text-green-mid font-semibold px-4 py-3.5 hover:underline">
                  Start again
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="font-dm-sans text-xs text-text-mid text-center mt-6 leading-[1.6] max-w-2xl mx-auto">
          This check is for general education. It is not a validated screening tool and cannot diagnose autism or rule it out.
          If you have any concern about your child’s development, please speak to your doctor.
        </p>
      </div>
    </section>
  )
}
