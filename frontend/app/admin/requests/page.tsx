'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, Calendar, User, MessageSquare, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Chicago';

export default function RequestsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        const res = await fetch('/api/admin/requests');
        const data = await res.json().catch(() => ({}));
        setRequests(data.requests || []);
        setLoading(false);
    };

    const handleAction = async (id: string, action: 'accepted' | 'declined') => {
        setProcessing(id);
        try {
            // Use server-side API to handle Stripe Capture/Cancel
            const res = await fetch(`/api/admin/bookings/${id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("Action failed", data.error);
                alert(`Failed to ${action} booking: ${data.error}`);
                return;
            }

            // Remove from list on success
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error updating booking:', error);
            alert("An error occurred. Please check the logs.");
        } finally {
            setProcessing(null);
        }
    };

    if (loading) return <div>Loading requests...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold">Booking Requests</h2>
                <p className="text-zinc-500">Review and manage pending appointments.</p>
            </div>

            {requests.length === 0 ? (
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-500">
                        <Check className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-white">All caught up!</h3>
                    <p className="text-zinc-500">There are no pending requests at the moment.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence>
                        {requests.map((req) => (
                            <motion.div
                                key={req.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-zinc-900 border border-white/5 rounded-xl p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden"
                            >
                                <div className="flex-1 space-y-4 relative z-10">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                                {req.services?.name}
                                                <span className="text-xs font-normal px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/20">PENDING PAY</span>
                                            </h3>
                                            <div className="flex items-center gap-2 text-zinc-400 mt-1">
                                                <User className="w-4 h-4" />
                                                <span>{req.customer_name}</span>
                                                <span className="text-zinc-600">•</span>
                                                <span className="text-xs">{req.customer_email}</span>
                                                <span className="text-zinc-600">•</span>
                                                <span className="text-xs">{req.customer_phone}</span>
                                            </div>
                                            {req.payment_status === 'authorized' && (
                                                <div className="mt-2 text-green-400 text-xs flex items-center gap-1">
                                                    <Check className="w-3 h-3" /> Payment Authorized (Hold)
                                                </div>
                                            )}
                                            {req.payment_status === 'cash_pending' && (
                                                <div className="mt-2 text-blue-400 text-xs flex items-center gap-1">
                                                    <CreditCard className="w-3 h-3" /> Card on File (Pay Cash)
                                                </div>
                                            )}
                                            {!['authorized', 'cash_pending'].includes(req.payment_status) && (
                                                <div className="mt-2 text-yellow-500 text-xs flex items-center gap-1">
                                                    Payment Status: {req.payment_status}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 text-sm">
                                        <div className="flex items-center gap-2 text-zinc-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                            <Calendar className="w-4 h-4 text-indigo-400" />
                                            {format(toZonedTime(req.start_datetime, TIMEZONE), 'EEEE, MMM d')}
                                        </div>
                                        <div className="flex items-center gap-2 text-zinc-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                            <Clock className="w-4 h-4 text-indigo-400" />
                                            {format(toZonedTime(req.start_datetime, TIMEZONE), 'h:mm a')}
                                        </div>
                                    </div>

                                    {req.client_notes && (
                                        <div className="bg-black/40 rounded-lg p-3 text-sm text-zinc-400 flex gap-3 border border-white/5">
                                            <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                                            <p>"{req.client_notes}"</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex md:flex-col gap-2 relative z-10 justify-end md:justify-center min-w-[140px]">
                                    <button
                                        disabled={!!processing}
                                        onClick={() => handleAction(req.id, 'accepted')}
                                        className="flex-1 bg-white text-black font-bold py-2 px-4 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Check className="w-4 h-4" />
                                        {processing === req.id ? '...' : 'Accept'}
                                    </button>
                                    <button
                                        disabled={!!processing}
                                        onClick={() => handleAction(req.id, 'declined')}
                                        className="flex-1 bg-red-500/10 text-red-400 font-bold py-2 px-4 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 border border-red-500/20 disabled:opacity-50"
                                    >
                                        <X className="w-4 h-4" />
                                        Decline
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
