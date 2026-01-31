'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ArrowLeft, Eye, X, CreditCard, DollarSign, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { UserMenu } from '@/components/UserMenu';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Toast } from '@/components/Toast';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { BookingDetailsModal } from '@/components/BookingDetailsModal';

const TIMEZONE = 'America/Chicago';
const CANCELLATION_WINDOW_HOURS = 4;

export default function BookingsPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; bookingId: string | null }>({
        isOpen: false,
        bookingId: null
    });
    const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean; booking: any }>({
        isOpen: false,
        booking: null
    });
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        const fetchBookings = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data } = await (supabase
                    .from('bookings') as any)
                    .select('*, services(name, price_cents, duration_min)')
                    .eq('client_id', user.id)
                    .order('start_datetime', { ascending: false });

                setBookings(data || []);
            }
            setLoading(false);
        };
        fetchBookings();
    }, []);

    const handleCancelBooking = (bookingId: string) => {
        setConfirmModal({ isOpen: true, bookingId });
    };

    const proceedWithCancellation = async () => {
        if (!confirmModal.bookingId) return;
        setCancelling(true);

        try {
            const res = await fetch(`/api/bookings/${confirmModal.bookingId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to cancel booking');
            }

            setBookings(prev => prev.map(b =>
                b.id === confirmModal.bookingId
                    ? { ...b, status: 'cancelled', payment_status: 'cancelled' }
                    : b
            ));
            setToast({ show: true, message: 'Booking cancelled successfully', type: 'success' });
            setConfirmModal({ isOpen: false, bookingId: null });
        } catch (error: any) {
            console.error('Error cancelling:', error);
            setToast({ show: true, message: error.message || 'Failed to cancel booking', type: 'error' });
        } finally {
            setCancelling(false);
        }
    };

    // Check if cancellation is allowed based on 4-hour rule
    const canCancel = (booking: any) => {
        // Always allow cancellation for pending/requested
        if (['requested', 'pending'].includes(booking.status)) {
            return { allowed: true, reason: '' };
        }

        // For accepted/confirmed, check the 4-hour window
        if (['accepted', 'confirmed'].includes(booking.status) && booking.start_datetime) {
            const appointmentTime = new Date(booking.start_datetime);
            const now = new Date();
            const hoursUntil = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

            if (hoursUntil < CANCELLATION_WINDOW_HOURS) {
                return {
                    allowed: false,
                    reason: `Too late to cancel. Please contact the shop.`
                };
            }
            return { allowed: true, reason: '' };
        }

        return { allowed: false, reason: 'Cannot cancel this booking' };
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            requested: 'Request Pending',
            pending: 'Request Pending',
            accepted: 'Confirmed',
            confirmed: 'Confirmed',
            arrived: 'Arrived',
            completed: 'Completed',
            cancelled: 'Cancelled',
            declined: 'Declined',
            no_show: 'No-show'
        };
        return labels[status] || status;
    };

    const getStatusColor = (status: string) => {
        if (['accepted', 'confirmed', 'completed'].includes(status)) return 'bg-green-500/20 text-green-400';
        if (['cancelled', 'declined', 'no_show'].includes(status)) return 'bg-red-500/20 text-red-400';
        if (status === 'arrived') return 'bg-blue-500/20 text-blue-400';
        return 'bg-yellow-500/20 text-yellow-400';
    };

    const getPaymentBadge = (paymentStatus: string, paymentMethod: string) => {
        const base = "px-2 py-0.5 rounded text-xs font-medium";

        if (paymentMethod === 'card') {
            if (paymentStatus === 'authorized') {
                return <span className={`${base} bg-blue-500/20 text-blue-400`}>Card Authorized (Hold)</span>;
            }
            if (paymentStatus === 'paid') {
                return <span className={`${base} bg-green-500/20 text-green-400`}>Paid</span>;
            }
        } else if (paymentMethod === 'cash') {
            if (paymentStatus === 'cash_pending' || paymentStatus === 'card_on_file') {
                return <span className={`${base} bg-yellow-500/20 text-yellow-400`}>Cash (Card on file)</span>;
            }
            if (paymentStatus === 'cash_paid') {
                return <span className={`${base} bg-green-500/20 text-green-400`}>Paid (Cash)</span>;
            }
            if (paymentStatus === 'no_show_charged') {
                return <span className={`${base} bg-purple-500/20 text-purple-400`}>No-show Charged</span>;
            }
        }

        if (paymentStatus === 'cancelled') {
            return <span className={`${base} bg-red-500/20 text-red-400`}>Cancelled</span>;
        }

        return null;
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-white p-4">
                <p className="mb-4">Please sign in to view your bookings.</p>
                <Link href="/" className="text-zinc-400 hover:text-white underline">Return Home</Link>
            </div>
        );
    }

    // Filter bookings based on active tab
    const now = new Date();
    const visibleBookings = bookings.filter(b => {
        const appointmentTime = new Date(b.start_datetime);
        const isFuture = appointmentTime >= now;

        if (activeTab === 'upcoming') {
            // Always show pending requests in upcoming, even if technically in the past
            if (['requested', 'pending'].includes(b.status)) return true;

            // For confirmed/active appointments, only show future ones
            const upcomingStatuses = ['accepted', 'confirmed', 'arrived'];
            return upcomingStatuses.includes(b.status) && isFuture;
        } else {
            // Don't show pending requests in history
            if (['requested', 'pending'].includes(b.status)) return false;

            // History: terminal statuses OR past appointments
            const historyStatuses = ['completed', 'cancelled', 'declined', 'no_show'];
            return historyStatuses.includes(b.status) || !isFuture;
        }
    });

    // Sort: upcoming ascending, history descending
    const sortedBookings = [...visibleBookings].sort((a, b) => {
        const dateA = new Date(a.start_datetime).getTime();
        const dateB = new Date(b.start_datetime).getTime();
        return activeTab === 'upcoming' ? dateA - dateB : dateB - dateA;
    });

    return (
        <main className="min-h-screen text-white relative">
            <header className="fixed top-0 left-0 right-0 z-40 p-6 flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto">
                    <Link href="/" className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-wider backdrop-blur-md bg-black/20 px-4 py-2 rounded-full border border-white/5">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Link>
                </div>
                <div className="pointer-events-auto">
                    <UserMenu />
                </div>
            </header>

            <div className="container mx-auto px-4 pt-24 max-w-4xl pb-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
                    <p className="text-zinc-400">Manage your upcoming appointments and view history.</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 bg-zinc-900/50 p-1 rounded-xl border border-white/5 w-fit mb-8">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'upcoming'
                            ? 'bg-white text-black shadow-lg'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Upcoming
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history'
                            ? 'bg-white text-black shadow-lg'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        History
                    </button>
                </div>

                {sortedBookings.length === 0 ? (
                    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-12 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-500">
                            <Calendar className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-white">
                            {activeTab === 'upcoming' ? 'No upcoming bookings' : 'No booking history'}
                        </h3>
                        <p className="text-zinc-500 mt-2">
                            {activeTab === 'upcoming'
                                ? 'Book an appointment to get started!'
                                : 'Your past bookings will appear here.'}
                        </p>
                        {activeTab === 'upcoming' && (
                            <Link
                                href="/"
                                className="inline-block mt-4 px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors"
                            >
                                Book Now
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence>
                            {sortedBookings.map(booking => {
                                const cancelCheck = canCancel(booking);
                                const showCancelButton = activeTab === 'upcoming' &&
                                    ['requested', 'pending', 'accepted', 'confirmed'].includes(booking.status);

                                return (
                                    <motion.div
                                        key={booking.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="bg-zinc-900 border border-white/5 rounded-xl p-6"
                                    >
                                        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                                            {/* Info Section */}
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-start justify-between flex-wrap gap-2">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                                                            {booking.services?.name}
                                                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${getStatusColor(booking.status)}`}>
                                                                {getStatusLabel(booking.status)}
                                                            </span>
                                                        </h3>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-white">
                                                            ${((booking.amount_cents || booking.services?.price_cents || 0) / 100).toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Date/Time */}
                                                <div className="flex items-center gap-4 text-sm flex-wrap">
                                                    <div className="flex items-center gap-2 text-zinc-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                                        <Calendar className="w-4 h-4 text-indigo-400" />
                                                        {format(toZonedTime(booking.start_datetime, TIMEZONE), 'EEEE, MMM d')}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-zinc-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                                        <Clock className="w-4 h-4 text-indigo-400" />
                                                        {format(toZonedTime(booking.start_datetime, TIMEZONE), 'h:mm a')}
                                                    </div>
                                                </div>

                                                {/* Payment Info */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${booking.payment_method === 'card'
                                                        ? 'bg-indigo-500/20 text-indigo-400'
                                                        : 'bg-emerald-500/20 text-emerald-400'
                                                        }`}>
                                                        {booking.payment_method === 'card' ? 'Card' : 'Cash'}
                                                    </span>
                                                    {getPaymentBadge(booking.payment_status, booking.payment_method)}
                                                </div>
                                            </div>

                                            {/* Actions Section */}
                                            <div className="flex flex-wrap lg:flex-col gap-2 lg:min-w-[140px] lg:justify-center">
                                                <button
                                                    onClick={() => setDetailsModal({ isOpen: true, booking })}
                                                    className="flex-1 lg:w-full bg-white/5 text-white font-medium py-2 px-4 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2 border border-white/10 text-sm"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    View Details
                                                </button>

                                                {showCancelButton && (
                                                    cancelCheck.allowed ? (
                                                        <button
                                                            onClick={() => handleCancelBooking(booking.id)}
                                                            className="flex-1 lg:w-full bg-red-500/10 text-red-400 font-medium py-2 px-4 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 border border-red-500/20 text-sm"
                                                        >
                                                            <X className="w-4 h-4" />
                                                            Cancel
                                                        </button>
                                                    ) : (
                                                        <div className="flex-1 lg:w-full" title={cancelCheck.reason}>
                                                            <button
                                                                disabled
                                                                className="w-full bg-zinc-800 text-zinc-500 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 border border-zinc-700 text-sm cursor-not-allowed"
                                                            >
                                                                <AlertCircle className="w-4 h-4" />
                                                                Too Late
                                                            </button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <Toast
                message={toast.message}
                isVisible={toast.show}
                type={toast.type}
                onClose={() => setToast({ ...toast, show: false })}
            />

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, bookingId: null })}
                onConfirm={proceedWithCancellation}
                title="Cancel Booking"
                description="Are you sure you want to cancel this appointment? This action cannot be undone."
                confirmText="Yes, Cancel Booking"
                cancelText="Keep Booking"
                isDestructive={true}
                isLoading={cancelling}
            />

            <BookingDetailsModal
                isOpen={detailsModal.isOpen}
                onClose={() => setDetailsModal({ isOpen: false, booking: null })}
                booking={detailsModal.booking}
            />
        </main>
    );
}
