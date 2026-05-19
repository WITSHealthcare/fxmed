'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { isDashboardUserSession, signIn, signOut } from '@/lib/supabase-auth'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      const userCanAccessDashboard = await isDashboardUserSession()

      if (!userCanAccessDashboard) {
        await signOut()
        throw new Error('Access denied. Dashboard role required.')
      }

      router.push('/admin')
      router.refresh()
    } catch (error: any) {
      console.error('Login error:', error)
      setError(error.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="/logo.png" 
            alt="FXMed" 
            className="h-[100px] w-auto mx-auto mb-4"
          />
          <h1 className="font-dm-sans font-bold text-green-deep text-[2rem] mb-2">
            Admin Login
          </h1>
          <p className="font-dm-sans text-text-mid text-[1rem]">
            Access the FXMed management dashboard
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-[24px] p-8 shadow-custom">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[12px] p-4 mb-6">
              <p className="font-dm-sans text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block font-dm-sans font-semibold text-green-deep mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-[12px] font-dm-sans focus:outline-none focus:ring-2 focus:ring-green-mid focus:border-transparent"
                placeholder="admin@fxmed.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block font-dm-sans font-semibold text-green-deep mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-[12px] font-dm-sans focus:outline-none focus:ring-2 focus:ring-green-mid focus:border-transparent pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-green-deep px-6 py-4 rounded-[50px] font-dm-sans font-bold text-[1rem] transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="font-dm-sans text-text-mid text-sm">
              Forgot your password? Contact the system administrator.
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <a 
            href="/"
            className="font-dm-sans text-green-deep font-medium text-sm hover:text-green-mid transition-colors no-underline"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
