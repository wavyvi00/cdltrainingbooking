'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check,
    X,
    Clock,
    Calendar,
    User,
    CreditCard,
    DollarSign,
    AlertTriangle,
    CheckCircle,
    Phone,
    Mail,
    UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ReasonModal } from '@/components/ReasonModal';
import { Toast } from '@/components/Toast';

const TIMEZONE = 'America/Chicago';

type StatusFilter = 'accepted' | 'arrived' | 'completed' | 'all';

type ModalAction = 'cancel' | 'charge' | null;

// Helper to check if charge button should show
const canShowChargeButton = (apt: any) => {
    if (apt.payment_method !== 'cash') return false;
    if (apt.status === 'completed' || apt.status === 'cancelled') return false;
    const blockedStatuses = ['no_show_charged', 'cash_paid', 'refunded', 'cancelled'];
    if (blockedStatuses.includes(apt.payment_status)) return false;
    return true;
};

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [filter, setFilter] = useState<StatusFilter>('accepted');

    // Modal state
    const [modalAction, setModalAction] = useState<ModalAction>(null);
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false
    });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, isVisible: true });
    };

    useEffect(() => {
        fetchAppointments();
    }, [filter]);

    const fetchAppointments = async () => {
        setLoading(true);
        const res = await fetch(`/api/admin/bookings?status=${encodeURIComponent(filter)}`);
        const data = await res.json().catch(() => ({}));
        setAppointments(data.appointments || []);
        setLoading(false);
    };

    const handleMarkArrived = async (id: string) => {
        setProcessing(id);
        try {
            const res = await fetch(`/api/admin/bookings/${id}/arrive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to mark arrived');
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'arrived' } : a));
            showToast('Customer marked as arrived.', 'success');
        } catch (e) {
            console.error(e);
            showToast('Failed to mark as arrived.', 'error');
        } finally {
            setProcessing(null);
        }
    };

    const handleMarkCompleted = async (id: string) => {
        setProcessing(id);
        try {
            const res = await fetch(`/api/admin/bookings/${id}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to mark completed');
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'completed' } : a));
            showToast('Appointment completed!', 'success');
        } catch (e) {
            console.error(e);
            showToast('Failed to mark as completed.', 'error');
        } finally {
            setProcessing(null);
        }
    };

    const handleMarkCashPaid = async (id: string) => {
        setProcessing(id);
        try {
            const res = await fetch(`/api/admin/bookings/${id}/cash-paid`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to mark cash paid');
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, payment_status: 'cash_paid' } : a));
            showToast('Payment received! Cash marked as paid.', 'success');
        } catch (e) {
            console.error(e);
            showToast('Failed to mark as cash paid.', 'error');
        } finally {
            setProcessing(null);
        }
    };

    // Open modal for charge
    const openChargeModal = (id: string) => {
        setSelectedAppointmentId(id);
        setModalAction('charge');
    };

    // Open modal for cancel
    const openCancelModal = (id: string) => {
        setSelectedAppointmentId(id);
        setModalAction('cancel');
    };

    const closeModal = () => {
        setModalAction(null);
        setSelectedAppointmentId(null);
    };

    const handleChargeConfirm = async (reason: string) => {
        if (!selectedAppointmentId) return;
        const id = selectedAppointmentId;
        setProcessing(id);
        try {
            const res = await fetch(`/api/admin/bookings/${id}/charge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const data = await res.json();
            if (!res.ok) {
                showToast(`Charge failed: ${data.error}`, 'error');
                return;
            }
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, payment_status: 'no_show_charged', charged_reason: reason } : a));
            closeModal();
            showToast('Customer has been charged successfully.', 'success');
        } catch (e) {
            console.error(e);
            showToast('Failed to charge customer.', 'error');
        } finally {
            setProcessing(null);
        }
    };

    const handleCancelConfirm = async (reason: string) => {
        if (!selectedAppointmentId) return;
        const id = selectedAppointmentId;
        setProcessing(id);
        try {
            const res = await fetch(`/api/admin/bookings/${id}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const data = await res.json();
            if (!res.ok) {
                showToast(`Cancellation failed: ${data.error}`, 'error');
                return;
            }
            setAppointments(prev => prev.filter(a => a.id !== id));
            closeModal();
            showToast('Appointment has been cancelled.', 'success');
        } catch (e) {
            console.error(e);
            showToast('Failed to cancel appointment.', 'error');
        } finally {
            setProcessing(null);
        }
    };

    const getPaymentStatusBadge = (status: string, method: string) => {
        const base = "px-2 py-0.5 rounded text-xs font-medium border";
        switch (status) {
            case 'paid':
                return <span className={`${base} bg-green-500/20 text-green-400 border-green-500/20`}>Paid</span>;
            case 'authorized':
                return <span className={`${base} bg-blue-500/20 text-blue-400 border-blue-500/20`}>Authorized</span>;
            case 'cash_pending':
                return <span className={`${base} bg-yellow-500/20 text-yellow-400 border-yellow-500/20`}>Cash Pending</span>;
            case 'cash_paid':
                return <span className={`${base} bg-green-500/20 text-green-400 border-green-500/20`}>Cash Paid</span>;
            case 'no_show_charged':
                return <span className={`${base} bg-purple-500/20 text-purple-400 border-purple-500/20`}>No-Show Charged</span>;
            case 'cancelled':
                return <span className={`${base} bg-red-500/20 text-red-400 border-red-500/20`}>Cancelled</span>;
            default:
                return <span className={`${base} bg-zinc-500/20 text-zinc-400 border-zinc-500/20`}>{status}</span>;
        }
    };

    if (loading) return <div>Loading appointments...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold">Appointments</h2>
                <p className="text-zinc-500">Manage accepted and completed appointments.</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 bg-zinc-900/50 p-1 rounded-xl border border-white/5 w-fit">
                {(['accepted', 'arrived', 'completed', 'all'] as StatusFilter[]).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
                                ? 'bg-white text-black shadow-lg'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {appointments.length === 0 ? (
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-500">
                        <Calendar className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-white">No appointments found</h3>
                    <p className="text-zinc-500">There are no {filter === 'all' ? '' : filter} appointments.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence>
                        {appointments.map((apt) => (
                            <motion.div
                                key={apt.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-zinc-900 border border-white/5 rounded-xl p-6 relative overflow-hidden"
                            >
                                <div className="flex flex-col lg:flex-row gap-6">
                                    {/* Info Section */}
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-start justify-between flex-wrap gap-2">
                                            <div>
                                                <h3 className="text-xl font-bold text-white flex items-center gap-2 flex-wrap">
                                                    {apt.services?.name}
                                                    <span className={`text-xs font-normal px-2 py-0.5 rounded ${apt.status === 'completed'
                                                            ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                                                            : apt.status === 'arrived'
                                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                                                                : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
                                                        }`}>
                                                        {apt.status.toUpperCase()}
                                                    </span>
                                                </h3>
                                                <div className="flex items-center gap-2 text-zinc-400 mt-1 flex-wrap">
                                                    <User className="w-4 h-4" />
                                                    <span>{apt.customer_name}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-zinc-500 text-sm mt-1 flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {apt.customer_email}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        {apt.customer_phone}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-white">
                                                    ${((apt.amount_cents || apt.services?.price_cents || 0) / 100).toFixed(2)}
                                                </div>
                                                <div className="flex items-center gap-2 justify-end mt-1">
                                                    <span className={`text-xs px-2 py-0.5 rounded ${apt.payment_method === 'card'
                                                            ? 'bg-indigo-500/20 text-indigo-400'
                                                            : 'bg-green-500/20 text-green-400'
                                                        }`}>
                                                        {apt.payment_method === 'card' ? 'Card' : 'Cash'}
                                                    </span>
                                                    {getPaymentStatusBadge(apt.payment_status, apt.payment_method)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm flex-wrap">
                                            <div className="flex items-center gap-2 text-zinc-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                                <Calendar className="w-4 h-4 text-indigo-400" />
                                                {format(toZonedTime(apt.start_datetime, TIMEZONE), 'EEEE, MMM d')}
                                            </div>
                                            <div className="flex items-center gap-2 text-zinc-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                                <Clock className="w-4 h-4 text-indigo-400" />
                                                {format(toZonedTime(apt.start_datetime, TIMEZONE), 'h:mm a')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions Section */}
                                    <div className="flex flex-wrap lg:flex-col gap-2 lg:min-w-[160px] lg:justify-center">
                                        {/* Mark Arrived: Only for accepted status */}
                                        {apt.status === 'accepted' && (
                                            <button
                                                disabled={!!processing}
                                                onClick={() => handleMarkArrived(apt.id)}
                                                className="flex-1 lg:w-full bg-blue-500/10 text-blue-400 font-bold py-2 px-4 rounded-lg hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2 border border-blue-500/20 disabled:opacity-50 text-sm"
                                            >
                                                <UserCheck className="w-4 h-4" />
                                                {processing === apt.id ? '...' : 'Mark Arrived'}
                                            </button>
                                        )}

                                        {/* Mark Completed: For arrived status */}
                                        {(apt.status === 'arrived' || apt.status === 'accepted') && apt.status !== 'completed' && (
                                            <button
                                                disabled={!!processing}
                                                onClick={() => handleMarkCompleted(apt.id)}
                                                className="flex-1 lg:w-full bg-green-500/10 text-green-400 font-bold py-2 px-4 rounded-lg hover:bg-green-500/20 transition-colors flex items-center justify-center gap-2 border border-green-500/20 disabled:opacity-50 text-sm"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                {processing === apt.id ? '...' : 'Complete'}
                                            </button>
                                        )}

                                        {/* Mark Cash Paid: Only if cash_pending */}
                                        {apt.payment_method === 'cash' && apt.payment_status === 'cash_pending' && (
                                            <button
                                                disabled={!!processing}
                                                onClick={() => handleMarkCashPaid(apt.id)}
                                                className="flex-1 lg:w-full bg-emerald-500/10 text-emerald-400 font-bold py-2 px-4 rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2 border border-emerald-500/20 disabled:opacity-50 text-sm"
                                            >
                                                <DollarSign className="w-4 h-4" />
                                                {processing === apt.id ? '...' : 'Mark Paid'}
                                            </button>
                                        )}

                                        {/* Charge No-Show: Only if conditions met */}
                                        {canShowChargeButton(apt) && (
                                            <button
                                                disabled={!!processing}
                                                onClick={() => openChargeModal(apt.id)}
                                                className="flex-1 lg:w-full bg-orange-500/10 text-orange-400 font-bold py-2 px-4 rounded-lg hover:bg-orange-500/20 transition-colors flex items-center justify-center gap-2 border border-orange-500/20 disabled:opacity-50 text-sm"
                                            >
                                                <AlertTriangle className="w-4 h-4" />
                                                {processing === apt.id ? '...' : 'Charge No-Show'}
                                            </button>
                                        )}

                                        {/* Cancel: For non-completed */}
                                        {apt.status !== 'completed' && (
                                            <button
                                                disabled={!!processing}
                                                onClick={() => openCancelModal(apt.id)}
                                                className="flex-1 lg:w-full bg-red-500/10 text-red-400 font-bold py-2 px-4 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 border border-red-500/20 disabled:opacity-50 text-sm"
                                            >
                                                <X className="w-4 h-4" />
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Cancel Modal */}
            <ReasonModal
                isOpen={modalAction === 'cancel'}
                onClose={closeModal}
                onConfirm={handleCancelConfirm}
                title="Cancel Appointment"
                description="Please provide a reason for cancelling this appointment. This action cannot be undone."
                confirmLabel="Cancel Appointment"
                confirmVariant="danger"
                isLoading={!!processing}
            />

            {/* Charge No-Show Modal */}
            <ReasonModal
                isOpen={modalAction === 'charge'}
                onClose={closeModal}
                onConfirm={handleChargeConfirm}
                title="Charge No-Show Fee"
                description="Please provide a reason for charging this customer. The full service price will be charged to their card on file."
                confirmLabel="Charge Customer"
                confirmVariant="warning"
                isLoading={!!processing}
            />

            {/* Toast Notification */}
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />
        </div>
    );
}
