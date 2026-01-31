'use client';

import { useState, useEffect } from 'react';
import { Clock, Check, Save, Loader2, Calendar as CalIcon, Trash2, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { Toast } from '@/components/Toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMEZONE = 'America/Chicago';

export default function AvailabilityPage() {
    const [bookingWindowDays, setBookingWindowDays] = useState('14');

    // Weekly Schedule State
    const [rules, setRules] = useState<any[]>([]);
    const [loadingRules, setLoadingRules] = useState(true);
    const [savingRules, setSavingRules] = useState(false);
    const [barberId, setBarberId] = useState<string | null>(null);

    // Time Off State
    const [timeOffs, setTimeOffs] = useState<any[]>([]);
    const [loadingTimeOff, setLoadingTimeOff] = useState(true);
    const [isAddingTimeOff, setIsAddingTimeOff] = useState(false);
    const [newTimeOff, setNewTimeOff] = useState({ start: '', end: '', reason: '' });
    const [toast, setToast] = useState({ show: false, message: '' });

    // ...

    useEffect(() => {
        const init = async () => {
            const res = await fetch('/api/admin/availability');
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setLoadingRules(false);
                setLoadingTimeOff(false);
                return;
            }
            setBarberId(data.barberId || null);

            const filled = DAYS.map((day, index) => {
                const existing = data.rules?.find((r: any) => r.day_of_week === index);
                return existing
                    ? { ...existing, isActive: true }
                    : { day_of_week: index, start_time: '09:00', end_time: '17:00', isActive: false };
            });
            setRules(filled);
            setTimeOffs(data.timeOffs || []);
            setBookingWindowDays(data.bookingWindowDays || '14');
            setLoadingRules(false);
            setLoadingTimeOff(false);
        };
        init();
    }, []);

    // --- Weekly Schedule Logic ---
    const updateRule = (index: number, field: string, value: any) => {
        const newRules = [...rules];
        newRules[index] = { ...newRules[index], [field]: value };
        setRules(newRules);
    };

    // --- Time Off Logic ---
    const addTimeOff = async () => {
        if (!barberId || !newTimeOff.start || !newTimeOff.end) return;

        const res = await fetch('/api/admin/time-off', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                start_datetime: fromZonedTime(newTimeOff.start, TIMEZONE).toISOString(),
                end_datetime: fromZonedTime(newTimeOff.end, TIMEZONE).toISOString(),
                reason: newTimeOff.reason
            })
        });
        const payload = await res.json().catch(() => ({}));

        if (payload.timeOff) {
            setTimeOffs([...timeOffs, payload.timeOff].sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()));
            setIsAddingTimeOff(false);
            setNewTimeOff({ start: '', end: '', reason: '' });
            setToast({ show: true, message: 'Time off block added' });
        }
    };

    const deleteTimeOff = async (id: string) => {
        await fetch('/api/admin/time-off', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        setTimeOffs(timeOffs.filter(t => t.id !== id));
        setToast({ show: true, message: 'Time off block removed' });
    };

    const saveAvailability = async () => {
        setSavingRules(true);
        if (!barberId) return;

        await fetch('/api/admin/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rules, bookingWindowDays })
        });
        setSavingRules(false);
        setToast({ show: true, message: 'Settings & schedule updated' });
    };

    // ...

    if (loadingRules || loadingTimeOff) return <div>Loading schedule...</div>;

    return (
        <div className="max-w-4xl space-y-12">
            {/* General Settings */}
            <section>
                <h2 className="text-3xl font-bold mb-4">Availability Settings</h2>
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
                    <div className="max-w-sm">
                        <label className="block text-sm font-bold text-zinc-400 mb-2">Booking Window (Days)</label>
                        <p className="text-xs text-zinc-500 mb-2">How many days in advance can customers book?</p>
                        <input
                            type="number"
                            min="1"
                            max="365"
                            value={bookingWindowDays}
                            onChange={(e) => setBookingWindowDays(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-lg py-2 px-3 text-white focus:border-indigo-500 transition-colors"
                        />
                    </div>
                </div>
            </section>

            {/* Weekly Schedule Section */}
            <section>
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-3xl font-bold">Weekly Schedule</h2>
                        <p className="text-zinc-500">Set your recurring availability for bookings.</p>
                    </div>
                    <button
                        onClick={saveAvailability}
                        disabled={savingRules}
                        className="bg-white text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-zinc-200 transition-colors"
                    >
                        {savingRules ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>

                <div className="space-y-4">
                    {rules.map((rule, i) => (
                        <div key={i} className={`bg-zinc-900 border ${rule.isActive ? 'border-white/10' : 'border-white/5 opacity-50'} rounded-xl p-6 transition-all`}>
                            <div className="flex items-center gap-6">
                                <div className="w-32">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${rule.isActive ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600'}`}>
                                            {rule.isActive && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={rule.isActive}
                                            onChange={(e) => updateRule(i, 'isActive', e.target.checked)}
                                            className="hidden"
                                        />
                                        <span className={`font-bold ${rule.isActive ? 'text-white' : 'text-zinc-500'}`}>{DAYS[i]}</span>
                                    </label>
                                </div>

                                {rule.isActive ? (
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="relative group flex-1">
                                            <Clock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                                            <input
                                                type="time"
                                                value={rule.start_time}
                                                onChange={(e) => updateRule(i, 'start_time', e.target.value)}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2 pl-9 pr-2 text-white font-code focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                        <span className="text-zinc-500">to</span>
                                        <div className="relative group flex-1">
                                            <Clock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                                            <input
                                                type="time"
                                                value={rule.end_time}
                                                onChange={(e) => updateRule(i, 'end_time', e.target.value)}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2 pl-9 pr-2 text-white font-code focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 text-zinc-600 text-sm italic">
                                        Unavailable
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <hr className="border-white/5" />

            {/* Time Off Section */}
            <section>
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <CalIcon className="w-6 h-6 text-orange-400" />
                            Time Off
                        </h2>
                        <p className="text-zinc-500">Block dates for vacation or personal time.</p>
                    </div>
                    <button
                        onClick={() => setIsAddingTimeOff(true)}
                        className="bg-white/5 border border-white/10 text-white hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Block
                    </button>
                </div>

                {/* Add Form */}
                <AnimatePresence>
                    {isAddingTimeOff && (
                        <div className="bg-zinc-900 border border-orange-500/20 rounded-xl p-6 mb-6">
                            <h3 className="font-bold mb-4">New Time Off Block</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">Start</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full bg-black border border-white/10 rounded p-2 text-white scheme-dark"
                                        value={newTimeOff.start}
                                        onChange={(e) => setNewTimeOff({ ...newTimeOff, start: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">End</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full bg-black border border-white/10 rounded p-2 text-white scheme-dark"
                                        value={newTimeOff.end}
                                        onChange={(e) => setNewTimeOff({ ...newTimeOff, end: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">Reason (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Vacation"
                                        className="w-full bg-black border border-white/10 rounded p-2 text-white"
                                        value={newTimeOff.reason}
                                        onChange={(e) => setNewTimeOff({ ...newTimeOff, reason: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setIsAddingTimeOff(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancel</button>
                                <button onClick={addTimeOff} className="bg-orange-500 text-black font-bold px-4 py-2 rounded hover:bg-orange-400">Add Block</button>
                            </div>
                        </div>
                    )}
                </AnimatePresence>

                {/* List */}
                <div className="grid gap-4">
                    {timeOffs.length === 0 ? (
                        <div className="text-zinc-500 text-sm italic">No upcoming time off scheduled.</div>
                    ) : (
                        timeOffs.map(t => (
                            <div key={t.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                                        <CalIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{t.reason || 'Time Off'}</p>
                                        <p className="text-sm text-zinc-500">
                                            {formatInTimeZone(t.start_datetime, TIMEZONE, 'MMM d, h:mma')} — {formatInTimeZone(t.end_datetime, TIMEZONE, 'MMM d, h:mma')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteTimeOff(t.id)}
                                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <Toast
                message={toast.message}
                isVisible={toast.show}
                onClose={() => setToast({ ...toast, show: false })}
            />
        </div>
    );
}
