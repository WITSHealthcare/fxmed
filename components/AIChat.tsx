'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  "What services do you offer?",
  "How do I book a home visit?",
  "What are your prices?",
  "Tell me about your programs",
]

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (text?: string) => {
    const content = text || inputValue
    if (!content.trim() || isTyping) return

    const userMessage: Message = { role: 'user', content }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputValue('')
    setIsTyping(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again or contact us at fxmed@wellnesswits.com",
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gold text-green-deep w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-gold-light transition-colors z-50"
        aria-label="Open Zara"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[560px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-green-deep/10">
      {/* Header */}
      <div className="bg-green-deep text-cream p-4 rounded-t-2xl flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img src="/Zara.png" alt="Zara" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-dm-sans font-semibold text-sm">Zara</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <p className="text-xs text-cream/70">Online — here to help</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-cream/70 hover:text-cream transition-colors"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-text-mid text-sm">
            <div className="mb-4">
              <div className="w-12 h-12 bg-green-deep/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-deep">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                </svg>
              </div>
              <h4 className="font-dm-sans font-semibold text-green-deep mb-2">Welcome to FXMed!</h4>
              <p className="text-[0.85rem] leading-[1.6]">
                Hi, I'm Zara! I can answer questions about FXMed's services, programs, and pricing — or help you book an appointment.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="bg-cream text-green-deep px-3 py-1.5 rounded-full text-xs font-medium hover:bg-green-deep hover:text-cream transition-colors border border-green-deep/10"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-1">
                <img src="/Zara.png" alt="Zara" className="w-full h-full object-cover" />
              </div>
            )}
            <div className={`max-w-[78%] ${
              message.role === 'user'
                ? 'bg-green-deep text-cream'
                : 'bg-gray-100 text-gray-800'
            } rounded-2xl px-4 py-2.5 text-sm leading-[1.6] whitespace-pre-wrap`}>
              {message.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-1">
              <img src="/Zara.png" alt="Zara" className="w-full h-full object-cover" />
            </div>
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            disabled={isTyping}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-green-deep/40 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isTyping}
            className="bg-gold text-green-deep w-10 h-10 rounded-full flex items-center justify-center hover:bg-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className="text-center text-[0.7rem] text-gray-400 mt-2">Powered by FXMed AI</p>
      </div>
    </div>
  )
}
