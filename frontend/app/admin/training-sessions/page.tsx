'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, Users, Truck, User, ChevronRight,
    Check, X, AlertTriangle, BookOpen, Timer, DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { Toast } from '@/components/Toast';

const TIMEZONE = 'America/New_York';

interface TrainingSession {
    id: string;
    module_id: string;
    module_name: string;
    module_type: 'road' | 'backing' | 'pretrip';
    session_date: string;
    start_time: string;
    end_time: string;
    session_type: 'private' | 'paired' | 'group';
    max_capacity: number;
    current_capacity: number;
    instructor_name?: string;
    truck_name?: string;
    status: 'open' | 'full' | 'in_progress' | 'completed' | 'cancelled';
    bookings: SessionBooking[];
}

interface SessionBooking {
    id: string;
    student_id: string;
    student_name: string;
    student_phone?: string;
    status: string;
    payment_status: string;
    hours_logged: number;
    arrived_at?: string;
}

type DateFilter = 'today' | 'upcoming' | 'past' | 'all';

const moduleColors = {
    road: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    backing: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    pretrip: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

export default function TrainingSessionsPage() {
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState<DateFilter>('today');
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const [processing, setProcessing] = useState<string | null>(null);

    // Hour logging state
    const [loggingBookingId, setLoggingBookingId] = useState<string | null>(null);
    const [hoursToLog, setHoursToLog] = useState<number>(1);

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '', type: 'success', isVisible: false
    });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, isVisible: true });
    };

    useEffect(() => {
        fetchSessions();
    }, [dateFilter]);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/training-sessions?filter=${dateFilter}`);
            const data = await res.json();
            setSessions(data.sessions || []);
        } catch (err) {
            console.error('Failed to fetch sessions:', err);
            showToast('Failed to load sessions', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkArrived = async (bookingId: string) => {
        setProcessing(bookingId);
        try {
            const res = await fetch(`/api/admin/bookings/${bookingId}/arrive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error('Failed to mark arrived');

            setSessions(prev => prev.map(session => ({
                ...session,
                bookings: session.bookings.map(b =>
                    b.id === bookingId ? { ...b, status: 'arrived', arrived_at: new Date().toISOString() } : b
                )
            })));
            showToast('Student marked as arrived');
        } catch (e) {
            showToast('Failed to mark arrived', 'error');
        } finally {
            setProcessing(null);
        }
    };

    const handleLogHours = async (bookingId: string, hours: number) => {
        setProcessing(bookingId);
        try {
            const res = await fetch(`/api/admin/bookings/${bookingId}/log-hours`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hours })
            });
            if (!res.ok) throw new Error('Failed to log hours');

            setSessions(prev => prev.map(session => ({
                ...session,
                bookings: session.bookings.map(b =>
                    b.id === bookingId ? { ...b, hours_logged: hours, status: 'completed' } : b
                )
            })));
            setLoggingBookingId(null);
            showToast(`${hours} hour(s) logged successfully`);
        } catch (e) {
            showToast('Failed to log hours', 'error');
        } finally {
            setProcessing(null);
        }
    };

    const handleCompleteSession = async (sessionId: string) => {
        setProcessing(sessionId);
        try {
            const res = await fetch(`/api/admin/training-sessions/${sessionId}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error('Failed to complete session');

            setSessions(prev => prev.map(s =>
                s.id === sessionId ? { ...s, status: 'completed' } : s
            ));
            showToast('Session marked as completed');
        } catch (e) {
            showToast('Failed to complete session', 'error');
        } finally {
            setProcessing(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const base = "px-2 py-0.5 rounded text-xs font-medium border";
        switch (status) {
            case 'open': return <span className={`${base} bg-green-500/20 text-green-400 border-green-500/20`}>Open</span>;
            case 'full': return <span className={`${base} bg-amber-500/20 text-amber-400 border-amber-500/20`}>Full</span>;
            case 'in_progress': return <span className={`${base} bg-blue-500/20 text-blue-400 border-blue-500/20`}>In Progress</span>;
            case 'completed': return <span className={`${base} bg-zinc-500/20 text-zinc-400 border-zinc-500/20`}>Completed</span>;
            case 'cancelled': return <span className={`${base} bg-red-500/20 text-red-400 border-red-500/20`}>Cancelled</span>;
            default: return <span className={`${base} bg-zinc-500/20 text-zinc-400 border-zinc-500/20`}>{status}</span>;
        }
    };

    const getBookingStatusBadge = (status: string, paymentStatus: string) => {
        const base = "px-2 py-0.5 rounded text-xs font-medium";
        if (status === 'completed') return <span className={`${base} bg-green-500/20 text-green-400`}>Completed</span>;
        if (status === 'arrived') return <span className={`${base} bg-blue-500/20 text-blue-400`}>Arrived</span>;
        if (status === 'no_show') return <span className={`${base} bg-red-500/20 text-red-400`}>No Show</span>;
        return <span className={`${base} bg-yellow-500/20 text-yellow-400`}>Confirmed</span>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-pulse text-zinc-500">Loading training sessions...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold">Training Sessions</h2>
                <p className="text-zinc-500">Manage CDL training sessions and log student hours.</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 bg-zinc-900/50 p-1 rounded-xl border border-white/5 w-fit">
                {(['today', 'upcoming', 'past', 'all'] as DateFilter[]).map(f => (
                    <button
                        key={f}
                        onClick={() => setDateFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateFilter === f
                                ? 'bg-white text-black shadow-lg'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {sessions.length === 0 ? (
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-500">
                        <Calendar className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-white">No sessions found</h3>
                    <p className="text-zinc-500">There are no {dateFilter === 'all' ? '' : dateFilter} training sessions.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence>
                        {sessions.map((session) => (
                            <motion.div
                                key={session.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden"
                            >
                                {/* Session Header */}
                                <button
                                    onClick={() => setExpandedSession(
                                        expandedSession === session.id ? null : session.id
                                    )}
                                    className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${moduleColors[session.module_type]}`}>
                                            {session.module_type === 'pretrip' ? (
                                                <BookOpen className="w-6 h-6" />
                                            ) : (
                                                <Truck className="w-6 h-6" />
                                            )}
                                        </div>

                                        <div className="text-left">
                                            <h3 className="font-bold text-white flex items-center gap-2">
                                                {session.module_name}
                                                {getStatusBadge(session.status)}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm text-zinc-400 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(session.session_date + 'T12:00:00'), 'EEE, MMM d')}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {session.start_time} - {session.end_time}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {session.current_capacity}/{session.max_capacity}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {session.instructor_name && (
                                            <span className="text-sm text-zinc-400 hidden md:block">
                                                <User className="w-3 h-3 inline mr-1" />
                                                {session.instructor_name}
                                            </span>
                                        )}
                                        <ChevronRight className={`w-5 h-5 text-zinc-500 transition-transform ${expandedSession === session.id ? 'rotate-90' : ''
                                            }`} />
                                    </div>
                                </button>

                                {/* Expanded Content - Students List */}
                                <AnimatePresence>
                                    {expandedSession === session.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-white/5"
                                        >
                                            <div className="p-5 space-y-4">
                                                {/* Session Info */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                    <div className="bg-white/5 rounded-lg p-3">
                                                        <span className="text-zinc-500 block">Session Type</span>
                                                        <span className="text-white font-medium capitalize">{session.session_type}</span>
                                                    </div>
                                                    <div className="bg-white/5 rounded-lg p-3">
                                                        <span className="text-zinc-500 block">Instructor</span>
                                                        <span className="text-white font-medium">{session.instructor_name || 'Unassigned'}</span>
                                                    </div>
                                                    <div className="bg-white/5 rounded-lg p-3">
                                                        <span className="text-zinc-500 block">Truck</span>
                                                        <span className="text-white font-medium">{session.truck_name || 'N/A'}</span>
                                                    </div>
                                                    <div className="bg-white/5 rounded-lg p-3">
                                                        <span className="text-zinc-500 block">Enrolled</span>
                                                        <span className="text-white font-medium">{session.current_capacity} students</span>
                                                    </div>
                                                </div>

                                                {/* Students List */}
                                                <div>
                                                    <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                                                        Enrolled Students
                                                    </h4>

                                                    {session.bookings.length === 0 ? (
                                                        <p className="text-zinc-500 text-sm">No students enrolled yet.</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {session.bookings.map((booking) => (
                                                                <div
                                                                    key={booking.id}
                                                                    className="bg-white/5 rounded-lg p-4 flex items-center justify-between flex-wrap gap-3"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white font-bold">
                                                                            {booking.student_name?.charAt(0) || '?'}
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-medium text-white flex items-center gap-2">
                                                                                {booking.student_name}
                                                                                {getBookingStatusBadge(booking.status, booking.payment_status)}
                                                                            </div>
                                                                            {booking.student_phone && (
                                                                                <div className="text-sm text-zinc-500">{booking.student_phone}</div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        {/* Hours logged display */}
                                                                        <div className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
                                                                            <Timer className="w-4 h-4" />
                                                                            {booking.hours_logged}h logged
                                                                        </div>

                                                                        {/* Action buttons */}
                                                                        {booking.status === 'confirmed' && (
                                                                            <button
                                                                                onClick={() => handleMarkArrived(booking.id)}
                                                                                disabled={!!processing}
                                                                                className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition disabled:opacity-50"
                                                                            >
                                                                                {processing === booking.id ? '...' : 'Mark Arrived'}
                                                                            </button>
                                                                        )}

                                                                        {booking.status === 'arrived' && (
                                                                            <>
                                                                                {loggingBookingId === booking.id ? (
                                                                                    <div className="flex items-center gap-2">
                                                                                        <input
                                                                                            type="number"
                                                                                            min="0"
                                                                                            max="8"
                                                                                            step="0.5"
                                                                                            value={hoursToLog}
                                                                                            onChange={(e) => setHoursToLog(parseFloat(e.target.value) || 0)}
                                                                                            className="w-16 bg-zinc-800 border border-white/10 rounded px-2 py-1 text-white text-center"
                                                                                        />
                                                                                        <button
                                                                                            onClick={() => handleLogHours(booking.id, hoursToLog)}
                                                                                            disabled={!!processing}
                                                                                            className="bg-green-500/10 text-green-400 p-1.5 rounded hover:bg-green-500/20 disabled:opacity-50"
                                                                                        >
                                                                                            <Check className="w-4 h-4" />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => setLoggingBookingId(null)}
                                                                                            className="bg-red-500/10 text-red-400 p-1.5 rounded hover:bg-red-500/20"
                                                                                        >
                                                                                            <X className="w-4 h-4" />
                                                                                        </button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setLoggingBookingId(booking.id);
                                                                                            setHoursToLog(1);
                                                                                        }}
                                                                                        className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition"
                                                                                    >
                                                                                        Log Hours
                                                                                    </button>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Session Actions */}
                                                {session.status !== 'completed' && session.status !== 'cancelled' && (
                                                    <div className="flex gap-3 pt-4 border-t border-white/5">
                                                        <button
                                                            onClick={() => handleCompleteSession(session.id)}
                                                            disabled={!!processing}
                                                            className="bg-green-500/10 text-green-400 px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-500/20 transition disabled:opacity-50 flex items-center gap-2"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                            {processing === session.id ? 'Processing...' : 'Complete Session'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />
        </div>
    );
}
