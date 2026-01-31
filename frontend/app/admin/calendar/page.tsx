'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { ChevronLeft, ChevronRight, User, Clock } from 'lucide-react';

const TIMEZONE = 'America/Chicago';

export default function CalendarPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [currentDate, setCurrentDate] = useState(() => toZonedTime(new Date(), TIMEZONE));
    const [weekStart, setWeekStart] = useState(() => startOfWeek(toZonedTime(new Date(), TIMEZONE), { weekStartsOn: 0 }));

    useEffect(() => {
        setWeekStart(startOfWeek(currentDate, { weekStartsOn: 0 }));
        fetchBookings();
    }, [currentDate]);

    const fetchBookings = async () => {
        const res = await fetch('/api/admin/calendar');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            console.error('Error fetching bookings:', data?.error);
        }
        setBookings(data.bookings || []);
    };

    const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

    const getBookingsForDay = (date: Date) => {
        // "date" is the day we are rendering (e.g. at 00:00 local browser time)
        // We need to compare it to the booking time in OKC time.

        return bookings.filter(b => {
            // Convert the UTC booking time to OKC time
            const bookingZoned = toZonedTime(b.start_datetime, TIMEZONE);
            // Check if it falls on the same day as "date" (which is just a day object)
            return isSameDay(bookingZoned, date);
        })
            .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
    };

    const handlePreviousWeek = () => {
        setCurrentDate(prev => subWeeks(prev, 1));
    };

    const handleNextWeek = () => {
        setCurrentDate(prev => addWeeks(prev, 1));
    };

    const handleToday = () => {
        setCurrentDate(toZonedTime(new Date(), TIMEZONE));
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            {/* Header with Navigation */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Calendar</h1>

                <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-white/10">
                    <button
                        onClick={handlePreviousWeek}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                        title="Previous Week"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <button
                        onClick={handleToday}
                        className="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    >
                        Today
                    </button>

                    <button
                        onClick={handleNextWeek}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                        title="Next Week"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-7 gap-px bg-white/10 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                {days.map((day, i) => {
                    const todayZoned = toZonedTime(new Date(), TIMEZONE);
                    const isToday = isSameDay(day, todayZoned);
                    return (
                        <div key={i} className="bg-zinc-950 flex flex-col min-h-0">
                            <div className={`p-3 text-center border-b border-white/5 ${isToday ? 'bg-indigo-500/10' : ''}`}>
                                <p className="text-xs text-zinc-500 uppercase font-bold">{formatInTimeZone(day, TIMEZONE, 'EEE')}</p>
                                <p className={`text-lg font-bold ${isToday ? 'text-indigo-400' : 'text-white'}`}>{formatInTimeZone(day, TIMEZONE, 'd')}</p>
                            </div>
                            <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                                {getBookingsForDay(day).map(booking => {
                                    const bookingZoned = toZonedTime(booking.start_datetime, TIMEZONE);
                                    return (
                                        <div key={booking.id} className="bg-zinc-900 border border-white/5 rounded p-2 hover:border-white/20 transition-colors group cursor-pointer relative overflow-hidden">
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${['confirmed', 'accepted', 'completed'].includes(booking.status) ? 'bg-green-500' :
                                                booking.status === 'arrived' ? 'bg-blue-500' :
                                                    booking.status === 'no_show' ? 'bg-red-500' :
                                                        'bg-orange-500' // requested/pending
                                                }`} />
                                            <div className="pl-3">
                                                <p className="text-xs text-zinc-400 font-code mb-0.5">{format(bookingZoned, 'h:mm a')}</p>
                                                <p className="text-sm font-bold text-white truncate">{booking.customer_name || 'Client'}</p>
                                                <p className="text-xs text-zinc-500 truncate">{booking.services?.name}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
