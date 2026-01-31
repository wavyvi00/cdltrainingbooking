'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Wifi, Car, Check, Clock, Info, Phone } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'America/Chicago';

export default function ArrivalPage() {
    const params = useParams();
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [arrived, setArrived] = useState(false);

    // Timer state
    const [timeLeft, setTimeLeft] = useState<string>('');

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        const fetchBooking = async () => {
            if (!params?.id) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }
            const { data, error } = await supabase
                .from('bookings')
                .select('*, profiles:client_id(full_name), services(name)')
                .eq('id', params.id)
                .single();

            if (data) {
                if (data.client_id && data.client_id !== user.id) {
                    setLoading(false);
                    return;
                }
                setBooking(data);
                if (data.status === 'arrived') {
                    setArrived(true);
                }
            }
            setLoading(false);
        };
        fetchBooking();
    }, [params, supabase]);

    // Countdown Logic
    useEffect(() => {
        if (!booking) return;
        const timer = setInterval(() => {
            const start = new Date(booking.start_datetime).getTime();
            const now = new Date().getTime();
            const diff = start - now;

            if (diff <= 0) {
                setTimeLeft('Now');
            } else {
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                if (hours > 0) {
                    setTimeLeft(`${hours}h ${minutes}m`);
                } else {
                    setTimeLeft(`${minutes}m`);
                }
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [booking]);

    const handleCheckIn = async () => {
        if (arrived || !booking) return;

        // Optimistic update
        setArrived(true);
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#ffffff'] // Indigo & White
        });

        try {
            const res = await fetch(`/api/bookings/${booking.id}/arrive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to check in');
            }
        } catch (error) {
            console.error('Error checking in:', error);
            setArrived(false); // Revert on error
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Loading Concierge...</div>;
    if (!booking) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Booking not found.</div>;

    return (
        <main className="min-h-screen bg-black text-white p-6 relative overflow-hidden">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-md mx-auto space-y-8 relative z-10">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-8 text-center"
                >
                    <div className="inline-block p-3 rounded-full bg-zinc-900/50 border border-zinc-800 mb-4">
                        <Clock className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">
                        {arrived ? 'You are checked in.' : `See you in ${timeLeft}`}
                    </h1>
                    <p className="text-zinc-500">
                        {formatInTimeZone(booking.start_datetime, TIMEZONE, 'EEEE, MMM d')}
                        {' • '}
                        {formatInTimeZone(booking.start_datetime, TIMEZONE, 'h:mm a')}
                    </p>
                </motion.header>

                {/* Main Action: I'm Here */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <button
                        onClick={handleCheckIn}
                        disabled={arrived}
                        className={`
                            w-full py-6 rounded-2xl font-bold text-xl tracking-wide transition-all duration-500
                            flex items-center justify-center gap-3 shadow-2xl
                            ${arrived
                                ? 'bg-zinc-900 text-green-500 border border-green-500/20 cursor-default'
                                : 'bg-white text-black hover:scale-[1.02] active:scale-[0.98] shadow-white/10'
                            }
                        `}
                    >
                        {arrived ? (
                            <>
                                <Check className="w-6 h-6" />
                                <span>Checked In</span>
                            </>
                        ) : (
                            <>
                                <MapPin className="w-6 h-6" />
                                <span>I'm Here</span>
                            </>
                        )}
                    </button>
                    {!arrived && (
                        <p className="text-center text-xs text-zinc-600 mt-3 uppercase tracking-widest">
                            Tap when you arrive at the studio
                        </p>
                    )}
                </motion.div>

                <hr className="border-white/10" />

                {/* Studio Details Accordion-style cards */}
                <div className="space-y-4">
                    {/* Location */}
                    <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 space-y-3">
                        <div className="flex items-center gap-3 text-zinc-300">
                            <Car className="w-5 h-5 text-zinc-500" />
                            <span className="font-medium">The Cabin</span>
                        </div>
                        <p className="text-sm text-zinc-500 pl-8 leading-relaxed">
                            123 Barber Lane, Suite 404.<br />
                            Park in the back lot (Spots 4-10).<br />
                            Door Code: <span className="text-white font-mono">1984#</span>
                        </p>
                        <a
                            href="https://maps.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-2 text-center text-xs font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 bg-indigo-500/5 rounded-lg border border-indigo-500/10"
                        >
                            Open Maps
                        </a>
                    </div>

                    {/* Wifi */}
                    <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-zinc-300">
                            <Wifi className="w-5 h-5 text-zinc-500" />
                            <span className="font-medium">Guest Wifi</span>
                        </div>
                        <div className="text-sm font-mono text-zinc-500">
                            RoyCuts_Guest / fade123
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-zinc-300">
                            <Phone className="w-5 h-5 text-zinc-500" />
                            <span className="font-medium">Need Help?</span>
                        </div>
                        <a href="sms:+1234567890" className="text-sm text-zinc-500 hover:text-white transition-colors">
                            Text Only
                        </a>
                    </div>
                </div>
            </div>
        </main>
    );
}
