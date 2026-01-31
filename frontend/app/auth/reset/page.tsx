'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
    const [checking, setChecking] = useState(true)
    const [email, setEmail] = useState<string | null>(null)
    const [missingSession, setMissingSession] = useState(false)
    const [resendEmail, setResendEmail] = useState('')
    const [resendLoading, setResendLoading] = useState(false)
    const [resendSuccess, setResendSuccess] = useState(false)
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        const checkUser = async () => {
            try {
                const res = await fetch('/api/auth/user')
                const payload = await res.json().catch(() => ({}))
                if (payload?.user?.email) {
                    setEmail(payload.user.email)
                } else {
                    setMissingSession(true)
                }
            } catch {
                setMissingSession(true)
            } finally {
                setChecking(false)
            }
        }

        checkUser()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!password || password.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }
        if (password !== confirm) {
            setError('Passwords do not match.')
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error
            setSuccess(true)
            await supabase.auth.signOut()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update password.')
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        const target = resendEmail.trim()
        if (!target) {
            setError('Please enter your email address first.')
            return
        }

        setResendLoading(true)
        setError(null)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(target, {
                redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
            })
            if (error) throw error
            setResendSuccess(true)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to send reset email.')
        } finally {
            setResendLoading(false)
        }
    }

    const passwordHint = () => {
        if (!password) return 'Use 8+ characters with a mix of letters and numbers.'
        if (password.length < 8) return 'Use at least 8 characters.'
        const hasLetter = /[a-z]/i.test(password)
        const hasNumber = /\d/.test(password)
        if (!hasLetter || !hasNumber) return 'Add letters and numbers for a stronger password.'
        return 'Looking good. Consider adding a symbol for extra strength.'
    }

    if (checking) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 text-center w-full max-w-md">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-zinc-400 text-sm">Preparing password reset...</p>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 text-center w-full max-w-md space-y-4">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                    <h1 className="text-xl font-bold text-white">Password updated</h1>
                    <p className="text-zinc-400 text-sm">
                        Your password has been reset. Please sign in again.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-200 transition-colors"
                    >
                        Go to login
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 w-full max-w-md">
                <h1 className="text-2xl font-bold text-white mb-2">Set a new password</h1>
                <p className="text-zinc-400 text-sm mb-6">
                    {email ? `Resetting password for ${email}.` : 'Enter your new password below.'}
                </p>

                {missingSession && !resendSuccess && (
                    <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                        <p className="text-sm text-zinc-400">
                            We couldn't verify your reset session. Enter your email to send a new reset link.
                        </p>
                        <input
                            type="email"
                            value={resendEmail}
                            onChange={(e) => setResendEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                        />
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resendLoading || !resendEmail.trim()}
                            className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {resendLoading ? 'Sending...' : 'Send reset link'}
                        </button>
                    </div>
                )}

                {resendSuccess && (
                    <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-400 text-center">
                        Reset link sent. Check your inbox.
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">New Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pr-10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-3 top-3.5 text-white/70 hover:text-white transition-colors"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500">{passwordHint()}</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Confirm Password</label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                                minLength={6}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pr-10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm((prev) => !prev)}
                                className="absolute right-3 top-3.5 text-white/70 hover:text-white transition-colors"
                                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                            >
                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-400 text-xs bg-red-400/10 p-2 rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-zinc-500">
                    <Link href="/login" className="text-white hover:underline font-medium">Back to login</Link>
                </div>
            </div>
        </div>
    )
}
