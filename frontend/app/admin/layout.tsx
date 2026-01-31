'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Calendar,
    CalendarCheck,
    MessageSquare,
    Scissors,
    Clock,
    LogOut,
    Menu,
    X,
    User,
    Home,
    Image
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true); // Default open on desktop
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;
        const timeoutMs = 8000;

        const checkAuth = async () => {
            try {
                setError(null);

                const authPromise = supabase.auth.getUser();
                const { data: { user }, error: authError } = await Promise.race([
                    authPromise,
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Auth timeout')), timeoutMs)
                    )
                ]) as any;

                if (authError || !user) {
                    console.log('AdminLayout: No user or auth error', authError);
                    setError('Please sign in to access the admin portal.');
                    router.replace('/login?redirectTo=/admin');
                    return;
                }

                console.log('AdminLayout Auth Check: User ID:', user.id);

                // Check role
                const { data: profile, error: profileError } = await (supabase
                    .from('profiles') as any)
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profileError) {
                    console.error('AdminLayout: Profile fetch error', profileError);
                    // Decide if we should redirect or show error. Safe default: redirect
                    setError('Unable to verify access. Please try again.');
                    router.replace('/');
                    return;
                }

                // Allow 'barber' or 'admin' 
                if (profile?.role !== 'admin' && profile?.role !== 'barber') {
                    console.log('AdminLayout: Unauthorized role', profile?.role);
                    setError('This account is not authorized for the admin portal.');
                    router.replace('/'); // Redirect unauthorized
                    return;
                }

                setUser(user);
                setRole(profile.role);
            } catch (err) {
                console.error('AdminLayout: Unexpected error', err);
                setError('Unable to verify access. Please refresh or sign in again.');
                router.replace('/login?redirectTo=/admin');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        checkAuth();

        return () => {
            isMounted = false;
        };
    }, [router]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-white">Loading Admin Portal...</div>;
    }
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                <div className="max-w-md text-center space-y-4 px-6">
                    <h2 className="text-xl font-bold">Access blocked</h2>
                    <p className="text-zinc-400">{error}</p>
                    <div className="flex items-center justify-center gap-3">
                        <Link
                            href="/login?redirectTo=/admin"
                            className="px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
                        >
                            Go to login
                        </Link>
                        <Link
                            href="/"
                            className="px-4 py-2 border border-white/10 rounded-lg text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
                        >
                            Back to site
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const navItems = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Calendar', href: '/admin/calendar', icon: Calendar },
        { name: 'Requests', href: '/admin/requests', icon: MessageSquare },
        { name: 'Appointments', href: '/admin/appointments', icon: CalendarCheck },
        { name: 'Services', href: '/admin/services', icon: Scissors },
        { name: 'Availability', href: '/admin/availability', icon: Clock },
        { name: 'Gallery', href: '/admin/gallery', icon: Image },
    ];

    return (
        <div className="min-h-screen flex text-white font-sans">
            {/* Mobile Sidebar Toggle */}
            <button
                className="md:hidden fixed top-4 right-4 z-50 p-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                onClick={() => setSidebarOpen(!sidebarOpen)}
            >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Sidebar */}
            <AnimatePresence mode='wait'>
                {(sidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
                    <motion.aside
                        initial={{ x: -280 }}
                        animate={{ x: 0 }}
                        exit={{ x: -280 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className={`fixed inset-y-0 left-0 z-40 w-72 bg-black/80 backdrop-blur-xl border-r border-white/10 flex flex-col ${sidebarOpen ? 'block' : 'hidden md:block'}`}
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/5">
                            <h1 className="text-2xl font-black tracking-tighter text-white">
                                CABINET<span className="text-indigo-500">.</span>
                            </h1>
                            <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Admin Console</p>
                        </div>

                        {/* Nav */}
                        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                            ? 'bg-white text-black shadow-lg shadow-white/10 font-bold'
                                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <item.icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-zinc-500 group-hover:text-white transition-colors'}`} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="px-4 pb-4">
                            <Link
                                href="/"
                                className="flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/10"
                            >
                                <Home className="w-5 h-5" />
                                Back to Website
                            </Link>
                        </div>

                        {/* Footer User */}
                        <div className="p-4 border-t border-white/5">
                            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/50 rounded-xl border border-white/5">
                                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                                    {user.email?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{user.email}</p>
                                    <p className="text-xs text-zinc-500 capitalize">{role}</p>
                                </div>
                                <Link href="/" className="p-2 hover:text-red-400 transition-colors" title="Exit to Site">
                                    <LogOut className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-72' : ''} p-8`}>
                <div className="max-w-7xl mx-auto space-y-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
