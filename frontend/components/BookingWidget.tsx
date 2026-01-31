'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Calendar, User, Scissors, MapPin, ChevronRight, Check, CreditCard, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '@/lib/supabaseClient';
import { addDays } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { PaymentForm } from './PaymentForm';
import { Toast } from './Toast';

// Load Stripe outside of component re-renders
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const TIMEZONE = 'America/Chicago';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function BookingWidget() {
    const router = useRouter();
    const [step, setStep] = useState<'service' | 'time' | 'review' | 'payment' | 'confirmed'>('service');
    const [selectedService, setSelectedService] = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
    const [setupIntentId, setSetupIntentId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');


    // Saved Cards State
    const [savedCards, setSavedCards] = useState<any[]>([]);
    const [selectedSavedCard, setSelectedSavedCard] = useState<string | null>(null); // payment method ID
    const [useNewCard, setUseNewCard] = useState(false);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false
    });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, isVisible: true });
    };

    // Fix: Use local date for default, avoiding UTC shift issue (e.g. 8PM CST -> 2AM UTC next day)
    const getSmartStartDate = () => {
        const now = new Date();
        const zonedNow = toZonedTime(now, TIMEZONE);
        const start = addDays(zonedNow, zonedNow.getHours() >= 12 ? 1 : 0);
        return formatInTimeZone(start, TIMEZONE, 'yyyy-MM-dd');
    };

    const [selectedDate, setSelectedDate] = useState<string>(getSmartStartDate());
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [bookingWindow, setBookingWindow] = useState(14);

    useEffect(() => {
        const fetchSettings = async () => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const res = await fetch('/api/auth/user', { signal: controller.signal });
            clearTimeout(timeout);
            if (!res.ok) return;
            const payload = await res.json().catch(() => ({}));
            if (!payload.user) return;
            fetch('/api/settings?key=booking_window_days')
                .then(res => res.json())
                .then(data => {
                    if (data.value) setBookingWindow(parseInt(data.value));
                })
                .catch(err => console.error(err));
        };
        fetchSettings();
    }, []);

    // Dynamic Services State
    const [services, setServices] = useState<any[]>([]);
    const [loadingServices, setLoadingServices] = useState(true);

    // Customer Details
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [authLoading, setAuthLoading] = useState(true); // Block render until auth check

    useEffect(() => {
        const fetchServices = async () => {
            const { data } = await (supabase.from('services') as any)
                .select('*')
                .eq('active', true)
                .order('price_cents', { ascending: true });

            if (data) {
                setServices(data);
            }
            setLoadingServices(false);
        };

        fetchServices();

        // Auto-fill user details if logged in
        const checkUser = async () => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                const res = await fetch('/api/auth/user', { signal: controller.signal });
                clearTimeout(timeout);
                if (!res.ok) throw new Error(`Auth fetch failed: ${res.status}`);
                const payload = await res.json().catch(() => ({}));
                const user = payload.user ?? null;
                if (user) {
                    setCustomerName(user.user_metadata.full_name || '');
                    setCustomerEmail(user.email || '');
                    setCustomerPhone(user.user_metadata.phone || user.phone || '');
                } else {
                    // Redirect if not logged in
                    const currentPath = window.location.pathname;
                    // If we are on /book, we want to redirect back here.
                    // Note: window.location.search might have ?service=... preserve it!
                    const search = window.location.search;
                    router.push(`/login?redirectTo=${encodeURIComponent(currentPath + search)}`);
                    return; // Don't set loading false, let redirect happen
                }
            } catch (err) {
                const currentPath = window.location.pathname;
                const search = window.location.search;
                router.push(`/login?redirectTo=${encodeURIComponent(currentPath + search)}`);
                return;
            } finally {
                setAuthLoading(false);
            }
        };
        checkUser();
    }, []);


    const fetchSlots = async (date: string) => {
        setLoadingSlots(true);
        try {
            const service = services.find(s => s.id === selectedService);
            const duration = service ? service.duration_min : 30;

            const res = await fetch(`/api/availability?date=${date}&duration=${duration}`);
            const data = await res.json();
            setAvailableSlots(data.slots || []);
        } catch (e) {
            console.error(e);
            setAvailableSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    };

    const handleServiceSelect = async (serviceId: string) => {
        setSelectedService(serviceId);
        // Reset slot when service changes
        setSelectedSlot(null);
    };

    const handleDateSelect = (date: string) => {
        setSelectedDate(date);
        setSelectedSlot(null);
        fetchSlots(date);
    };

    // Initial fetch for today's slots if waiting on service step isn't desired
    // But currently we fetch when entering time step or selecting service? 
    // Let's fetch when entering time step or if service is selected.
    useEffect(() => {
        if (step === 'time') {
            fetchSlots(selectedDate);
        }
    }, [step, selectedDate]);

    // Auto-select service from URL
    useEffect(() => {
        if (loadingServices || services.length === 0) return;
        const params = new URLSearchParams(window.location.search);
        const serviceParam = params.get('service');
        if (serviceParam && services.find(s => s.id === serviceParam)) {
            handleServiceSelect(serviceParam);
        }
    }, [loadingServices, services]);

    const handleProceedToPayment = async () => {
        setIsSubmitting(true);
        try {
            // Optimization: If using saved card for Cash/Setup, skip SetupIntent creation
            if (paymentMethod === 'cash' && selectedSavedCard) {
                await handleConfirmBooking({ sId: undefined, pId: undefined });
                return;
            }

            // 1. Create PaymentIntent via Edge Function
            const { data, error } = await supabase.functions.invoke('payment', {
                body: { service_id: selectedService, type: paymentMethod === 'card' ? 'payment' : 'setup' }
            });

            if (error || !data?.client_secret) {
                console.error("Payment init failed", error);
                showToast("Could not initialize payment. Please try again.", 'error');
                return;
            }

            setClientSecret(data.client_secret);
            setStep('payment');
        } catch (e) {
            console.error(e);
            showToast("An error occurred initializing payment.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePaymentSuccess = async (intentId: string) => {
        // Distinguish between payment (card) and setup (cash) intents
        if (paymentMethod === 'card') {
            setPaymentIntentId(intentId);
            await handleConfirmBooking({ pId: intentId });
        } else {
            // Cash mode: This is a SetupIntent ID
            setSetupIntentId(intentId);
            await handleConfirmBooking({ sId: intentId });
        }
    };

    const handleConfirmBooking = async ({ pId, sId }: { pId?: string, sId?: string } = {}) => { // Updated signature
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: selectedService,
                    date: selectedDate,
                    time: selectedSlot,
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    payment_intent_id: pId || paymentIntentId,
                    setup_intent_id: sId || setupIntentId,
                    payment_method_id: selectedSavedCard, // Only used if cash/saved card
                    payment_method: paymentMethod
                })
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 409) {
                    showToast(data.error || "This slot was just taken. Please start over.", 'error');
                    // Reset to time selection to pick a new slot
                    setStep('time');
                    // Refresh slots
                    fetchSlots(selectedDate);
                } else {
                    showToast(data.error || "Failed to book appointment.", 'error');
                }
                return;
            }

            setStep('confirmed');
        } catch (e) {
            console.error("Booking failed", e);
            showToast("Failed to book appointment. Please try again.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // REVISION: Let's actually enforce the start date logic to skip today if it's too late.
    // If now + 12h > End of Today (in Timezone), then Today is useless.
    // Logic:
    // 1. Get End of Today in OKC.
    // 2. If (Now + 12h) > End of Today, shift start day by +1.
    const getStartDateOffset = () => {
        const now = new Date();
        const zonedNow = toZonedTime(now, TIMEZONE);
        const endOfTodayZoned = new Date(zonedNow);
        endOfTodayZoned.setHours(23, 59, 59, 999);

        // Convert back to compare timestamps? 
        // Simpler: If now is past 12:00 PM (noon), 12h later is tomorrow.
        // So if (Now > 12:00 PM), skip 'Today'.
        if (zonedNow.getHours() >= 12) return 1;
        return 0;
    };

    // Use this offset in the dates generation
    const startOffset = getStartDateOffset();
    const smartDates = Array.from({ length: bookingWindow }, (_, i) => {
        const base = toZonedTime(new Date(), TIMEZONE);
        const d = addDays(base, i + startOffset);
        return {
            full: formatInTimeZone(d, TIMEZONE, 'yyyy-MM-dd'),
            day: formatInTimeZone(d, TIMEZONE, 'EEE'),
            date: parseInt(formatInTimeZone(d, TIMEZONE, 'd'), 10),
        };
    });

    const getServiceName = () => services.find(s => s.id === selectedService)?.name;
    const getServicePrice = () => {
        const s = services.find(s => s.id === selectedService);
        return s ? `$${(s.price_cents / 100).toFixed(2)}` : '';
    };

    const handleBookAnother = () => {
        setStep('service');
        setSelectedService(null);
        setSelectedSlot(null);
        setClientSecret(null);
        setPaymentIntentId(null);
        setSetupIntentId(null);
        setIsSubmitting(false);
    };

    if (authLoading) {
        return <div className="min-h-[400px] flex items-center justify-center text-zinc-500">Checking access...</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full max-w-md mx-auto lg:mx-0"
        >
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl p-6 md:p-8">
                {/* Glow effect */}
                <div className="absolute top-0 right-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-white/5 blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-10 -mb-10 h-32 w-32 rounded-full bg-white/5 blur-3xl" />

                <div className="relative z-10">
                    {step === 'confirmed' ? (
                        <div className="text-center py-10">
                            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Check className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
                                    <p className="text-zinc-400 mb-8">
                                        You're all set for {(() => {
                                            const dateObj = fromZonedTime(`${selectedDate} 00:00`, TIMEZONE);
                                            return formatInTimeZone(dateObj, TIMEZONE, 'EEEE, MMMM d, yyyy');
                                        })()} at {selectedSlot}.
                                    </p>
                            <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
                                <button
                                    onClick={handleBookAnother}
                                    className="w-full px-6 py-3 bg-white text-black font-bold rounded-lg hover:scale-105 transition-transform"
                                >
                                    Book Another
                                </button>
                                <a
                                    href="/"
                                    className="w-full px-6 py-3 bg-white/5 border border-white/10 text-zinc-400 font-bold rounded-lg hover:bg-white/10 hover:text-white transition-all text-center"
                                >
                                    Return Home
                                </a>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {step === 'service' && 'Book Your Cut'}
                                {step === 'time' && 'Select Date & Time'}
                                {step === 'review' && 'Review Booking'}
                                {step === 'payment' && 'Payment Method'}
                            </h2>
                            <p className="text-zinc-400 text-sm mb-6">
                                {step === 'service' && 'Select a service to get started.'}
                                {step === 'time' && 'Choose a slot that works for you.'}
                                {step === 'review' && 'Fill in your details to confirm.'}
                                {step === 'payment' && 'Enter your card details to reserve.'}
                            </p>

                            <div className="space-y-4">
                                {/* Step 1: Service Selection */}
                                {step === 'service' && (
                                    <div className="space-y-4">
                                        <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
                                            Service
                                        </label>

                                        {loadingServices ? (
                                            <div className="flex items-center justify-center py-8 text-zinc-500 animate-pulse">
                                                Loading services...
                                            </div>
                                        ) : (
                                            <div className="grid gap-3">
                                                {services.map((service) => (
                                                    <button
                                                        key={service.id}
                                                        onClick={() => handleServiceSelect(service.id)}
                                                        className={cn(
                                                            "group flex items-center justify-between p-3 rounded-lg border transition-all duration-200 text-left shrink-0",
                                                            selectedService === service.id
                                                                ? "bg-white text-black border-white"
                                                                : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:border-white/20"
                                                        )}
                                                    >
                                                        <div className="w-full">
                                                            <div className="font-medium flex items-center justify-between w-full">
                                                                <span className="truncate mr-2">{service.name}</span>
                                                                {selectedService === service.id && <Check className="w-4 h-4 shrink-0" />}
                                                            </div>
                                                            <div className={cn("text-xs mt-0.5", selectedService === service.id ? "text-zinc-600" : "text-zinc-500")}>
                                                                {service.duration_min}m • ${(service.price_cents / 100).toFixed(2)}
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Step 2: Date & Time Selection */}
                                {step === 'time' && (
                                    <div className="space-y-6">
                                        {/* Date Picker */}
                                        <div className="space-y-2">
                                            <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Date</label>
                                            <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
                                                {smartDates.map((dateObj) => (
                                                    <button
                                                        key={dateObj.full}
                                                        onClick={() => handleDateSelect(dateObj.full)}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center min-w-[4.5rem] h-16 rounded-xl border transition-all",
                                                            selectedDate === dateObj.full
                                                                ? "bg-white text-black border-white shadow-lg scale-105"
                                                                : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:border-white/20"
                                                        )}
                                                    >
                                                        <span className="text-xs font-medium uppercase">{dateObj.day}</span>
                                                        <span className="text-lg font-bold">{dateObj.date}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Time Slots */}
                                        <div className="space-y-2">
                                            <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Time</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {loadingSlots ? (
                                                    <div className="col-span-3 text-center py-8 text-zinc-500">
                                                        Loading availability...
                                                    </div>
                                                ) : availableSlots.length > 0 ? (
                                                    availableSlots.map((slot) => (
                                                        <button
                                                            key={slot}
                                                            onClick={() => setSelectedSlot(slot)}
                                                            className={cn(
                                                                "py-2 px-3 rounded-lg border text-sm font-bold transition-all",
                                                                selectedSlot === slot
                                                                    ? "bg-white text-black border-white"
                                                                    : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                                                            )}
                                                        >
                                                            {slot}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="col-span-3 text-center py-8 text-zinc-500 text-sm">
                                                        No slots available on this date.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Review & Form */}
                                {step === 'review' && (
                                    <div className="space-y-6">
                                        {/* Summary Card */}
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-400">Service</span>
                                                <span className="font-bold text-white">{getServiceName()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-400">Date</span>
                                                <span className="font-bold text-white">
                                                    {formatInTimeZone(fromZonedTime(`${selectedDate} 00:00`, TIMEZONE), TIMEZONE, 'EEEE, MMMM d')}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-400">Time</span>
                                                <span className="font-bold text-white">{selectedSlot}</span>
                                            </div>
                                            <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                                                <span className="text-zinc-400">Total Price</span>
                                                <span className="font-bold text-indigo-400">{getServicePrice()}</span>
                                            </div>
                                        </div>

                                        {/* Inputs */}
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-zinc-500 block mb-1.5 ml-1">Full Name</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                    <input
                                                        type="text"
                                                        value={customerName}
                                                        onChange={(e) => setCustomerName(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                                                        placeholder="John Doe"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-zinc-500 block mb-1.5 ml-1">Email</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                    <input
                                                        type="email"
                                                        value={customerEmail}
                                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                                                        placeholder="john@example.com"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-zinc-500 block mb-1.5 ml-1">Phone</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                    <input
                                                        type="tel"
                                                        value={customerPhone}
                                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                                                        placeholder="(555) 123-4567"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: Payment */}
                                {step === 'payment' && clientSecret && (
                                    <Elements
                                        key={clientSecret}
                                        stripe={stripePromise}
                                        options={{
                                            clientSecret,
                                            appearance: { theme: 'night', labels: 'floating' },
                                        }}
                                    >
                                        <PaymentForm
                                            amountDisplay={getServicePrice()}
                                            onSuccess={handlePaymentSuccess}
                                            onCancel={() => {
                                                setStep('review');
                                                setClientSecret(null);
                                            }}
                                            mode={paymentMethod === 'card' ? 'payment' : 'setup'}
                                        />
                                    </Elements>
                                )}

                                {/* Navigation / Buttons */}
                                {step !== 'payment' && (
                                    <div className="pt-4 flex gap-3">
                                        {step !== 'service' && (
                                            <button
                                                onClick={() => {
                                                    if (step === 'review') setStep('time');
                                                    else if (step === 'time') setStep('service');
                                                }}
                                                className="px-6 py-4 rounded-lg font-bold text-sm uppercase tracking-widest text-zinc-400 hover:bg-white/5 transition-colors"
                                            >
                                                Back
                                            </button>
                                        )}

                                        {step === 'service' && (
                                            <button
                                                disabled={!selectedService}
                                                onClick={() => setStep('time')}
                                                className={cn(
                                                    "w-full py-4 rounded-lg font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300",
                                                    selectedService
                                                        ? "bg-white text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                                )}
                                            >
                                                Next Step <ChevronRight className="w-4 h-4" />
                                            </button>
                                        )}

                                        {step === 'time' && (
                                            <button
                                                disabled={!selectedSlot || !selectedDate}
                                                onClick={() => setStep('review')}
                                                className={cn(
                                                    "flex-1 py-4 rounded-lg font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300",
                                                    selectedSlot
                                                        ? "bg-white text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                                )}
                                            >
                                                Review <ChevronRight className="w-4 h-4" />
                                            </button>
                                        )}

                                        {step === 'review' && (
                                            <div className="flex-1 flex flex-col gap-3">
                                                <div className="flex bg-white/5 p-1 rounded-lg">
                                                    <button
                                                        onClick={() => setPaymentMethod('card')}
                                                        className={cn(
                                                            "flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all",
                                                            paymentMethod === 'card' ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-400 hover:text-white"
                                                        )}
                                                    >
                                                        Pay Now (Card)
                                                    </button>
                                                    <button
                                                        onClick={() => setPaymentMethod('cash')}
                                                        className={cn(
                                                            "flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all",
                                                            paymentMethod === 'cash' ? "bg-green-600 text-white shadow-lg" : "text-zinc-400 hover:text-white"
                                                        )}
                                                    >
                                                        Pay Cash
                                                    </button>
                                                </div>

                                                {/* Saved Cards Selection for Cash Mode */}
                                                {paymentMethod === 'cash' && savedCards.length > 0 && (
                                                    <div className="mt-4 space-y-2">
                                                        <label className="text-xs uppercase text-zinc-500 font-bold">Select Card for Security</label>
                                                        {savedCards.map((card: any) => (
                                                            <button
                                                                key={card.id}
                                                                onClick={() => { setSelectedSavedCard(card.id); setUseNewCard(false); }}
                                                                className={cn(
                                                                    "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-sm",
                                                                    selectedSavedCard === card.id
                                                                        ? "bg-white/10 border-indigo-500 text-white"
                                                                        : "bg-black/20 border-white/5 text-zinc-400 hover:bg-white/5"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <CreditCard className="w-4 h-4" />
                                                                    <span className="capitalize">{card.card.brand} •••• {card.card.last4}</span>
                                                                </div>
                                                                {selectedSavedCard === card.id && <Check className="w-4 h-4 text-indigo-400" />}
                                                            </button>
                                                        ))}
                                                        <button
                                                            onClick={() => { setSelectedSavedCard(null); setUseNewCard(true); }}
                                                            className={cn(
                                                                "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-sm font-medium",
                                                                useNewCard
                                                                    ? "bg-white/10 border-indigo-500 text-white"
                                                                    : "bg-transparent border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500"
                                                            )}
                                                        >
                                                            <Plus className="w-4 h-4" /> Use a new card
                                                        </button>
                                                    </div>
                                                )}

                                                <button
                                                    disabled={isSubmitting || !customerName || !customerEmail || !customerPhone}
                                                    onClick={handleProceedToPayment}
                                                    className={cn(
                                                        "w-full py-4 rounded-lg font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300",
                                                        (!isSubmitting && customerName && customerEmail && customerPhone)
                                                            ? (paymentMethod === 'card'
                                                                ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_25px_rgba(79,70,229,0.4)]"
                                                                : "bg-green-600 text-white hover:bg-green-500 shadow-[0_0_25px_rgba(22,163,74,0.4)]")
                                                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                                    )}
                                                >
                                                    {isSubmitting ? (
                                                        <>Processing...</>
                                                    ) : (
                                                        <>{paymentMethod === 'card' ? 'Proceed to Pay' : 'Secure Spot'} <ChevronRight className="w-4 h-4" /></>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Custom Scrollbar Styles */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            `}</style>
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />
        </motion.div >
    );
}
