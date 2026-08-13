'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'
import { signIn, signOut } from '@/lib/supabase-auth'
import { isDashboardUser } from '@/lib/admin-auth'

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
      // Use the user returned by sign-in directly. Calling getUser() right after
      // signInWithPassword contends for the auth storage lock and can hang the
      // login ("Signing in..." forever), which surfaces as a failed page load.
      const { user } = await signIn(email, password)

      if (!isDashboardUser(user)) {
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
          <Image
            src="/logo.png"
            alt="FXMed"
            width={200}
            height={100}
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
                  {showPassword ? <EyeSlashIcon size={20} weight="duotone" /> : <EyeIcon size={20} weight="duotone" />}
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
