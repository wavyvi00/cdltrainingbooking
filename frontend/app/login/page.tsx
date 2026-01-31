'use client'

import { useState, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoginScene3D } from '@/components/LoginScene3D'
import { Lock, Mail, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'

function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [signupSuccess, setSignupSuccess] = useState(false)
    const [forgotPasswordSent, setForgotPasswordSent] = useState(false)
    const [showResendOption, setShowResendOption] = useState(false)
    const [resendLoading, setResendLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get('redirectTo') || '/bookings'

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setShowResendOption(false)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            const msg = error.message.toLowerCase()
            if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
                setShowResendOption(true)
            }
            if (msg.includes('rate') || msg.includes('limit') || msg.includes('too many')) {
                setError('Too many login attempts. Please wait a few minutes before trying again.')
            } else {
                setError(error.message)
            }
        } else {
            router.push(redirectTo)
        }
        setLoading(false)
    }

    const handleSignUp = async () => {
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        })

        if (error) {
            const msg = error.message.toLowerCase()
            if (msg.includes('rate') || msg.includes('limit')) {
                setError('Too many requests. Please wait a few minutes before trying again.')
            } else {
                setError(error.message)
            }
        } else {
            setSignupSuccess(true)
        }
        setLoading(false)
    }

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            setError('Please enter your email address first.')
            return
        }
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
        })

        if (error) {
            setError(error.message)
        } else {
            setForgotPasswordSent(true)
        }
        setLoading(false)
    }

    const handleResendConfirmation = async () => {
        if (!email.trim()) {
            setError('Please enter your email address first.')
            return
        }
        setResendLoading(true)
        setError(null)

        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email.trim(),
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        })

        if (error) {
            if (error.message.toLowerCase().includes('rate') || error.message.toLowerCase().includes('limit')) {
                setError('Too many requests. Please wait a few minutes before trying again.')
            } else {
                setError(error.message)
            }
        } else {
            setSignupSuccess(true)
            setShowResendOption(false)
        }
        setResendLoading(false)
    }

    // Signup success state
    if (signupSuccess) {
        return (
            <div className="w-full max-w-md text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold">Check Your Email</h1>
                <p className="text-zinc-400">
                    We've sent a confirmation link to <span className="text-white font-medium">{email}</span>.
                    Click the link to verify your account.
                </p>
                <p className="text-zinc-500 text-sm">
                    Didn't receive it? Check your spam folder.
                </p>
            </div>
        )
    }

    // Forgot password sent state
    if (forgotPasswordSent) {
        return (
            <div className="w-full max-w-md text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold">Reset Email Sent</h1>
                <p className="text-zinc-400">
                    Check your inbox at <span className="text-white font-medium">{email}</span> for password reset instructions.
                </p>
                <button
                    onClick={() => setForgotPasswordSent(false)}
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                >
                    ← Back to login
                </button>
            </div>
        )
    }

    return (
        <div className="w-full max-w-md space-y-8">
            <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h1>
                <p className="text-zinc-500">Sign in to access your dashboard.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium uppercase text-zinc-500 mb-1.5 ml-1">Email Address</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                                <Mail className="h-5 w-5" />
                            </div>
                            <input
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                type="email"
                                placeholder="admin@roycuts.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium uppercase text-zinc-500 mb-1.5 ml-1">Password</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                                <Lock className="h-5 w-5" />
                            </div>
                            <input
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 pl-10 pr-12 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/70 hover:text-white transition-colors"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                        <span className="block w-1.5 h-1.5 rounded-full bg-red-500" />
                        {error}
                    </div>
                )}

                {showResendOption && (
                    <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resendLoading || !email.trim()}
                        className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        {resendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Resend Confirmation Email'}
                    </button>
                )}

                <div className="space-y-4 pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-bold py-3.5 px-4 rounded-xl hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                    </button>

                    <button
                        type="button"
                        onClick={handleSignUp}
                        disabled={loading}
                        className="w-full bg-transparent border border-white/10 text-zinc-400 font-medium py-3.5 px-4 rounded-xl hover:bg-white/5 hover:text-white transition-all disabled:opacity-50"
                    >
                        Create Account
                    </button>

                    <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="w-full text-zinc-500 hover:text-zinc-300 text-xs font-medium transition-colors"
                    >
                        Forgot your password?
                    </button>
                </div>
            </form>

            <p className="text-center text-xs text-zinc-600">
                Top notch security. Only for authorized personnel.
            </p>
        </div>
    )
}

export default function LoginPage() {
    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-[#050505] text-white overflow-hidden">

            {/* Left: 3D Scene */}
            <div className="w-full md:w-1/2 h-[40vh] md:h-screen relative order-1 md:order-1">
                <LoginScene3D />
                <div className="absolute bottom-8 left-8 z-10 pointer-events-none hidden md:block">
                    <h2 className="text-4xl font-black tracking-tighter text-white mb-2">ROYCUTS<span className="text-indigo-500">.</span></h2>
                    <p className="text-zinc-400 max-w-sm">Premium styling, precision cuts, and a modern experience.</p>
                </div>
            </div>

            {/* Right: Login Form */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative z-20 order-2 md:order-2">
                <Suspense fallback={<div className="flex justify-center items-center w-full h-full"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
                    <LoginForm />
                </Suspense>
            </div>
        </div>
    )
}
