'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, CreditCard, DollarSign, Hash, FileText } from 'lucide-react';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Chicago';

interface BookingDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: {
        id: string;
        start_datetime: string;
        status: string;
        payment_method: string;
        payment_status: string;
        amount_cents?: number;
        admin_notes?: string;
        services?: {
            name: string;
            price_cents: number;
            duration_min?: number;
        };
    } | null;
}

export function BookingDetailsModal({ isOpen, onClose, booking }: BookingDetailsModalProps) {
    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!booking) return null;

    const price = (booking.amount_cents || booking.services?.price_cents || 0) / 100;
    const zonedDate = toZonedTime(booking.start_datetime, TIMEZONE);

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

    const getPaymentStatusLabel = (paymentStatus: string, paymentMethod: string) => {
        if (paymentMethod === 'card') {
            if (paymentStatus === 'authorized') return 'Card Authorized (Hold)';
            if (paymentStatus === 'paid') return 'Paid';
        } else if (paymentMethod === 'cash') {
            if (paymentStatus === 'cash_pending' || paymentStatus === 'card_on_file') return 'Cash (Card on file)';
            if (paymentStatus === 'cash_paid') return 'Paid (Cash)';
            if (paymentStatus === 'no_show_charged') return 'No-show Charged';
        }
        if (paymentStatus === 'cancelled') return 'Cancelled';
        return paymentStatus;
    };

    const getStatusColor = (status: string) => {
        if (['accepted', 'confirmed', 'completed'].includes(status)) return 'bg-green-500/20 text-green-400 border-green-500/20';
        if (['cancelled', 'declined', 'no_show'].includes(status)) return 'bg-red-500/20 text-red-400 border-red-500/20';
        if (status === 'arrived') return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20';
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
                        <div className="w-full max-w-md pointer-events-auto bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="p-6 border-b border-white/10">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{booking.services?.name || 'Booking'}</h3>
                                        <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(booking.status)}`}>
                                            {getStatusLabel(booking.status)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-zinc-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                {/* Date & Time */}
                                <div className="flex items-center gap-3 text-zinc-300">
                                    <div className="p-2 rounded-lg bg-white/5">
                                        <Calendar className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-zinc-500">Date</p>
                                        <p className="font-medium">{format(zonedDate, 'EEEE, MMMM d, yyyy')}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-zinc-300">
                                    <div className="p-2 rounded-lg bg-white/5">
                                        <Clock className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-zinc-500">Time</p>
                                        <p className="font-medium">
                                            {format(zonedDate, 'h:mm a')}
                                            {booking.services?.duration_min && ` (${booking.services.duration_min} min)`}
                                        </p>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="flex items-center gap-3 text-zinc-300">
                                    <div className="p-2 rounded-lg bg-white/5">
                                        <DollarSign className="w-4 h-4 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-zinc-500">Price</p>
                                        <p className="font-medium">${price.toFixed(2)}</p>
                                    </div>
                                </div>

                                {/* Payment */}
                                <div className="flex items-center gap-3 text-zinc-300">
                                    <div className="p-2 rounded-lg bg-white/5">
                                        <CreditCard className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-zinc-500">Payment</p>
                                        <p className="font-medium">
                                            {booking.payment_method === 'card' ? 'Card' : 'Cash'} — {getPaymentStatusLabel(booking.payment_status, booking.payment_method)}
                                        </p>
                                    </div>
                                </div>

                                {/* Booking ID */}
                                <div className="flex items-center gap-3 text-zinc-300">
                                    <div className="p-2 rounded-lg bg-white/5">
                                        <Hash className="w-4 h-4 text-zinc-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-zinc-500">Booking ID</p>
                                        <p className="font-medium font-mono text-xs">{booking.id.slice(0, 8).toUpperCase()}</p>
                                    </div>
                                </div>

                                {/* Admin Notes (if any) */}
                                {booking.admin_notes && (
                                    <div className="flex items-start gap-3 text-zinc-300">
                                        <div className="p-2 rounded-lg bg-white/5">
                                            <FileText className="w-4 h-4 text-yellow-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-zinc-500">Notes</p>
                                            <p className="text-sm text-zinc-400">{booking.admin_notes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="bg-white/5 px-6 py-4 flex justify-end">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
