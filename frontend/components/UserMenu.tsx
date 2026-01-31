'use client';

import { useState, useEffect, useRef } from 'react';
import { User, LogOut, Calendar, ChevronDown, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { AuthModal } from './AuthModal';
import { type User as SupabaseUser } from '@supabase/supabase-js';

export function UserMenu() {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const mounted = useRef(true);
    const authCheckHandled = useRef(false);
    const loadingRef = useRef(true);

    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    useEffect(() => {
        mounted.current = true;
        authCheckHandled.current = false;
        loadingRef.current = true;

        // Safety valve: Force loading to false after 6 seconds to prevent infinite spinner
        const safetyTimer = setTimeout(() => {
            if (mounted.current && loadingRef.current) {
                setLoading(false);
            }
        }, 6000);

        const checkAuth = async () => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                const res = await fetch('/api/auth/user', { signal: controller.signal });
                clearTimeout(timeout);
                if (!res.ok) throw new Error(`Auth fetch failed: ${res.status}`);
                const payload = await res.json().catch(() => ({}));
                const currentUser = payload.user as SupabaseUser | null;
                const currentRole = payload.role as string | null;
                if (!mounted.current || authCheckHandled.current) return;

                setUser(currentUser);

                if (mounted.current) setRole(currentRole ?? null);
            } catch (error) {
                if (mounted.current && !authCheckHandled.current) setUser(null);
            } finally {
                if (mounted.current && !authCheckHandled.current) {
                    setLoading(false);
                }
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            if (!mounted.current) return;
            checkAuth();
        });

        return () => {
            mounted.current = false;
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, []);

    const handleSignOut = async () => {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => { });
        setIsMenuOpen(false);
        setUser(null);
        setRole(null);
    };

    // Robust Loading State (doesn't block forever)
    if (loading) {
        return (
            <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse border border-white/5" />
        );
    }

    return (
        <>
            <div className="relative z-50 pointer-events-auto">
                {user ? (
                    // LOGGED IN USER
                    <div className="relative">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="flex items-center gap-3 bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-full pl-1.5 pr-4 py-1.5 hover:bg-zinc-800 transition-all group"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg group-hover:scale-105 transition-transform">
                                {user.user_metadata.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-white hidden md:block">
                                {user.user_metadata.full_name?.split(' ')[0] || 'Account'}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-2 w-56 bg-zinc-950/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden py-1"
                                >
                                    <div className="px-4 py-3 border-b border-white/10">
                                        <p className="text-sm font-medium text-white truncate">{user.user_metadata.full_name || 'User'}</p>
                                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                                    </div>

                                    {(role === 'admin' || role === 'barber') && (
                                        <Link
                                            href="/admin"
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-indigo-400 hover:bg-white/5 transition-colors text-left font-bold"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <LayoutDashboard className="w-4 h-4" />
                                            Admin Dashboard
                                        </Link>
                                    )}

                                    <Link
                                        href="/bookings"
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 transition-colors text-left"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <Calendar className="w-4 h-4" />
                                        My Bookings
                                    </Link>

                                    <Link
                                        href="/profile"
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 transition-colors text-left"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <User className="w-4 h-4" />
                                        Profile Settings
                                    </Link>

                                    <div className="border-t border-white/10 my-1" />

                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors text-left"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    // GUEST USER - GENERIC PROFILE ICON
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900/50 backdrop-blur-md border border-white/20 hover:bg-white/10 transition-all group"
                        title="Sign In / Profile"
                    >
                        <User className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
                    </button>
                )}
            </div>

            <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
}
