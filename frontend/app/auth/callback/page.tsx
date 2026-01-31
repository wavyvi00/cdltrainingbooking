'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Loader2, CheckCircle, XCircle, ArrowLeft, Mail } from 'lucide-react'

type CallbackStatus = 'loading' | 'success' | 'error'

function AuthCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [status, setStatus] = useState<CallbackStatus>('loading')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [email, setEmail] = useState('')
    const [resending, setResending] = useState(false)
    const [resendSuccess, setResendSuccess] = useState(false)

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const code = searchParams.get('code')
                const tokenHash = searchParams.get('token_hash')
                const type = searchParams.get('type') as 'signup' | 'recovery' | 'invite' | 'email' | null
                const requestedNext = searchParams.get('next') || '/bookings'
                const isSafeNext = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
                let next = isSafeNext ? requestedNext : '/bookings'
                const errorParam = searchParams.get('error')
                const errorDescription = searchParams.get('error_description')

                // Handle error from Supabase redirect
                if (errorParam) {
                    setStatus('error')
                    setErrorMessage(errorDescription || errorParam)
                    return
                }

                // Handle PKCE code exchange
                if (code) {
                    if (type === 'recovery') {
                        next = '/auth/reset'
                    }
                    const { error } = await supabase.auth.exchangeCodeForSession(code)
                    if (error) {
                        setStatus('error')
                        setErrorMessage(error.message)
                        return
                    }
                    setStatus('success')
                    setTimeout(() => router.push(next), 1500)
                    return
                }

                // Handle token_hash verification (magic link / OTP)
                if (tokenHash && type) {
                    if (type === 'recovery') {
                        next = '/auth/reset'
                    }
                    const { error } = await supabase.auth.verifyOtp({
                        token_hash: tokenHash,
                        type: type,
                    })
                    if (error) {
                        setStatus('error')
                        setErrorMessage(error.message)
                        return
                    }
                    setStatus('success')
                    setTimeout(() => router.push(next), 1500)
                    return
                }

                // No valid params found
                // If there are no params, check if we have a user session already, otherwise error
                const { data: { session } } = await supabase.auth.getSession()
                if (session) {
                    setStatus('success')
                    setTimeout(() => router.push(next), 1000)
                    return
                }

                setStatus('error')
                setErrorMessage('Invalid or missing confirmation parameters.')
            } catch (err: unknown) {
                setStatus('error')
                setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.')
            }
        }

        handleCallback()
    }, [searchParams, router])

    const handleResendConfirmation = async () => {
        if (!email.trim()) {
            setErrorMessage('Please enter your email address.')
            return
        }

        setResending(true)
        setErrorMessage(null)

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email.trim(),
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            })

            if (error) {
                if (error.message.toLowerCase().includes('rate') || error.message.toLowerCase().includes('limit')) {
                    setErrorMessage('Too many requests. Please wait a few minutes before trying again.')
                } else {
                    setErrorMessage(error.message)
                }
            } else {
                setResendSuccess(true)
            }
        } catch (err: unknown) {
            setErrorMessage(err instanceof Error ? err.message : 'Failed to resend confirmation email.')
        } finally {
            setResending(false)
        }
    }

    return (
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
            {status === 'loading' && (
                <>
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white mb-2">Verifying your account...</h1>
                    <p className="text-zinc-400 text-sm">Please wait while we confirm your email.</p>
                </>
            )}

            {status === 'success' && (
                <>
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white mb-2">Email Confirmed!</h1>
                    <p className="text-zinc-400 text-sm">Redirecting you to your dashboard...</p>
                </>
            )}

            {status === 'error' && (
                <>
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white mb-2">Verification Failed</h1>
                    <p className="text-red-400 text-sm mb-6">{errorMessage}</p>

                    {!resendSuccess ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider text-left block">
                                    Enter your email to resend:
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pl-10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                                    />
                                </div>
                                {!email.trim() && (
                                    <p className="text-amber-400 text-xs">Please enter your email address above</p>
                                )}
                            </div>

                            <button
                                onClick={handleResendConfirmation}
                                disabled={resending || !email.trim()}
                                className="w-full bg-indigo-600 text-white font-medium py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {resending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Mail className="w-4 h-4" />
                                        Resend Confirmation Email
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                            <p className="text-green-400 text-sm">Confirmation email sent! Check your inbox.</p>
                        </div>
                    )}

                    <button
                        onClick={() => router.push('/login')}
                        className="w-full mt-4 bg-zinc-800 text-white font-medium py-3 rounded-lg hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </button>
                </>
            )}
        </div>
    )
}

function LoadingFallback() {
    return (
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Loading...</h1>
            <p className="text-zinc-400 text-sm">Please wait a moment.</p>
        </div>
    )
}

export default function AuthCallbackPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md relative z-10">
                <Suspense fallback={<LoadingFallback />}>
                    <AuthCallbackContent />
                </Suspense>
            </div>
        </div>
    )
}
