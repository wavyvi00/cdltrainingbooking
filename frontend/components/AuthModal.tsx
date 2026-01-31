
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Loader2, ArrowRight, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [view, setView] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [signupSuccess, setSignupSuccess] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [showResendOption, setShowResendOption] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const resetState = () => {
        setView('signin');
        setEmail('');
        setPassword('');
        setFullName('');
        setLoading(false);
        setError(null);
        setSignupSuccess(false);
        setShowForgotPassword(false);
        setForgotPasswordSent(false);
        setResendLoading(false);
        setShowResendOption(false);
        setShowPassword(false);
    };

    useEffect(() => {
        if (!isOpen) {
            resetState();
        }
    }, [isOpen]);

    const handleResendConfirmation = async () => {
        if (!email.trim()) return;
        setResendLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email.trim(),
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                if (error.message.toLowerCase().includes('rate') || error.message.toLowerCase().includes('limit')) {
                    setError('Too many requests. Please wait a few minutes before trying again.');
                } else {
                    setError(error.message);
                }
            } else {
                setSignupSuccess(true);
                setShowResendOption(false);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to resend confirmation email.');
        } finally {
            setResendLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            setError('Please enter your email address first.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
            });

            if (error) {
                if (error.message.toLowerCase().includes('rate') || error.message.toLowerCase().includes('limit')) {
                    setError('Too many requests. Please wait a few minutes before trying again.');
                } else {
                    setError(error.message);
                }
            } else {
                setForgotPasswordSent(true);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to send reset email.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setShowResendOption(false);

        try {
            if (view === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                        data: {
                            full_name: fullName,
                            role: 'client',
                        },
                    },
                });
                if (error) throw error;
                setSignupSuccess(true);
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) {
                    // Check for specific error types
                    const msg = error.message.toLowerCase();
                    if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
                        setShowResendOption(true);
                    }
                    if (msg.includes('rate') || msg.includes('limit') || msg.includes('too many')) {
                        throw new Error('Too many login attempts. Please wait a few minutes before trying again.');
                    }
                    throw error;
                }
                onClose();
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4"
                    >
                        <div className="w-full max-w-md pointer-events-auto max-h-[calc(100vh-2rem)] overflow-y-auto">
                            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-2xl p-6 sm:p-8">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                {/* Signup Success State */}
                                {signupSuccess && (
                                    <div className="text-center py-4">
                                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                        <h2 className="text-xl font-bold text-white mb-2">Check Your Email</h2>
                                        <p className="text-zinc-400 text-sm mb-4">
                                            We've sent a confirmation link to <span className="text-white font-medium">{email}</span>.
                                            Click the link to verify your account.
                                        </p>
                                        <p className="text-zinc-500 text-xs">
                                            Didn't receive it? Check your spam folder or wait a moment and try again.
                                        </p>
                                    </div>
                                )}

                                {/* Forgot Password Sent State */}
                                {forgotPasswordSent && (
                                    <div className="text-center py-4">
                                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                        <h2 className="text-xl font-bold text-white mb-2">Reset Email Sent</h2>
                                        <p className="text-zinc-400 text-sm mb-4">
                                            Check your inbox at <span className="text-white font-medium">{email}</span> for password reset instructions.
                                        </p>
                                        <button
                                            onClick={() => { setForgotPasswordSent(false); setShowForgotPassword(false); }}
                                            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                                        >
                                            ← Back to login
                                        </button>
                                    </div>
                                )}

                                {/* Regular Form Header */}
                                {!signupSuccess && !forgotPasswordSent && (
                                    <div className="mb-6 text-center">
                                        <h2 className="text-2xl font-bold text-white mb-2">
                                            {showForgotPassword ? 'Reset Password' :
                                                view === 'signin' ? 'Welcome Back' : 'Create Account'}
                                        </h2>
                                        <p className="text-zinc-400 text-sm">
                                            {showForgotPassword ? 'Enter your email to receive reset instructions.' :
                                                view === 'signin' ? 'Enter your details to access your appointments.' : 'Join the exclusive client list.'}
                                        </p>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {view === 'signup' && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Full Name</label>
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                required
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pl-10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                                                placeholder="you@example.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={6}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pl-10 pr-10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
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
                                    </div>

                                    {error && (
                                        <div className="text-red-400 text-xs bg-red-400/10 p-2 rounded-lg text-center">
                                            {error}
                                        </div>
                                    )}

                                    {/* Resend Confirmation Option */}
                                    {showResendOption && (
                                        <button
                                            type="button"
                                            onClick={handleResendConfirmation}
                                            disabled={resendLoading}
                                            className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                        >
                                            {resendLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>Resend Confirmation Email</>
                                            )}
                                        </button>
                                    )}

                                    <button
                                        disabled={loading}
                                        type="submit"
                                        className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                {view === 'signin' ? 'Sign In' : 'Create Account'}
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>

                                    {/* Forgot Password Link */}
                                    {view === 'signin' && (
                                        <button
                                            type="button"
                                            onClick={handleForgotPassword}
                                            className="w-full text-zinc-500 hover:text-zinc-300 text-xs font-medium transition-colors"
                                        >
                                            Forgot your password?
                                        </button>
                                    )}
                                </form>

                                <div className="mt-6 text-center text-sm text-zinc-500">
                                    {view === 'signin' ? (
                                        <>
                                            New here?{' '}
                                            <button onClick={() => setView('signup')} className="text-white hover:underline font-medium">Create an account</button>
                                        </>
                                    ) : (
                                        <>
                                            Already have an account?{' '}
                                            <button onClick={() => setView('signin')} className="text-white hover:underline font-medium">Sign in</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
