'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
    Calendar, User, Truck, Clock, Users, ChevronRight, Check, 
    CreditCard, AlertCircle, MapPin, Star
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '@/lib/supabaseClient';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { PaymentForm } from './PaymentForm';
import { Toast } from './Toast';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Module type icons and colors
const moduleConfig = {
    road: {
        icon: Truck,
        color: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        label: 'Road Training',
        description: 'Private 1-on-1 behind-the-wheel driving',
    },
    backing: {
        icon: Truck,
        color: 'from-amber-500 to-orange-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        label: 'Backing Practice',
        description: 'Paired session (2 students) for maneuvers',
    },
    pretrip: {
        icon: Star,
        color: 'from-emerald-500 to-green-500',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        label: 'Pre-Trip Inspection',
        description: 'Group classroom + hands-on inspection',
    },
};

interface TrainingModule {
    id: string;
    name: string;
    module_type: 'road' | 'backing' | 'pretrip';
    description?: string;
    duration_min: number;
    price_cents: number;
    capacity: number;
    active: boolean;
}

interface AvailableSession {
    id?: string;
    module_id: string;
    module_name: string;
    module_type: 'road' | 'backing' | 'pretrip';
    session_type: 'private' | 'paired' | 'group';
    start_time: string;
    end_time: string;
    price_cents: number;
    capacity: number;
    current_capacity: number;
    is_fixed: boolean;
    is_new: boolean;
    instructor_name?: string;
    truck_name?: string;
}

interface TrainingDate {
    date: string;
    dayOfWeek: 'Saturday' | 'Sunday';
    hasAvailability: boolean;
    hasSessions: boolean;
    sessionsCount?: number;
}

type BookingStep = 'module' | 'date' | 'session' | 'review' | 'payment' | 'confirmed';

export function CDLBookingWidget() {
    const router = useRouter();
    const [step, setStep] = useState<BookingStep>('module');
    
    // Module selection
    const [modules, setModules] = useState<TrainingModule[]>([]);
    const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
    const [loadingModules, setLoadingModules] = useState(true);
    
    // Date selection
    const [trainingDates, setTrainingDates] = useState<TrainingDate[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [loadingDates, setLoadingDates] = useState(false);
    
    // Session selection
    const [sessions, setSessions] = useState<AvailableSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<AvailableSession | null>(null);
    const [loadingSessions, setLoadingSessions] = useState(false);
    
    // Payment
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
    
    // User
    const [authLoading, setAuthLoading] = useState(true);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '', type: 'success', isVisible: false
    });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, isVisible: true });
    };

    // Check auth and enrollment
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/auth/user');
                if (!res.ok) throw new Error('Not authenticated');
                const payload = await res.json();
                const user = payload.user;
                
                if (!user) {
                    router.push(`/login?redirectTo=${encodeURIComponent('/book')}`);
                    return;
                }
                
                setCustomerName(user.user_metadata?.full_name || '');
                setCustomerEmail(user.email || '');
                setCustomerPhone(user.user_metadata?.phone || user.phone || '');
                
                // For now, assume enrolled (enrollment check is done server-side)
                setIsEnrolled(true);
            } catch (err) {
                router.push(`/login?redirectTo=${encodeURIComponent('/book')}`);
            } finally {
                setAuthLoading(false);
            }
        };
        checkAuth();
    }, [router]);

    // Fetch training modules
    useEffect(() => {
        const fetchModules = async () => {
            try {
                const { data } = await (supabase.from('training_modules') as any)
                    .select('*')
                    .eq('active', true)
                    .order('display_order');
                
                if (data) {
                    setModules(data);
                }
            } catch (err) {
                console.error('Failed to fetch modules:', err);
            } finally {
                setLoadingModules(false);
            }
        };
        fetchModules();
    }, []);

    // Fetch training dates when entering date step
    useEffect(() => {
        if (step === 'date') {
            fetchDates();
        }
    }, [step]);

    // Fetch sessions when date is selected
    useEffect(() => {
        if (selectedDate && selectedModule) {
            fetchSessions(selectedDate);
        }
    }, [selectedDate, selectedModule]);

    const fetchDates = async () => {
        setLoadingDates(true);
        try {
            const res = await fetch('/api/sessions/dates?weeks=8');
            const data = await res.json();
            setTrainingDates(data.dates || []);
        } catch (err) {
            console.error('Failed to fetch dates:', err);
            showToast('Failed to load training dates', 'error');
        } finally {
            setLoadingDates(false);
        }
    };

    const fetchSessions = async (date: string) => {
        setLoadingSessions(true);
        try {
            const moduleType = selectedModule?.module_type;
            const url = moduleType 
                ? `/api/sessions?date=${date}&module_type=${moduleType}`
                : `/api/sessions?date=${date}`;
            
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.error) {
                showToast(data.message || data.error, 'error');
                setSessions([]);
            } else {
                setSessions(data.sessions || []);
            }
        } catch (err) {
            console.error('Failed to fetch sessions:', err);
            setSessions([]);
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleModuleSelect = (module: TrainingModule) => {
        setSelectedModule(module);
        setSelectedSession(null);
    };

    const handleDateSelect = (date: string) => {
        setSelectedDate(date);
        setSelectedSession(null);
        setStep('session');
    };

    const handleSessionSelect = (session: AvailableSession) => {
        setSelectedSession(session);
    };

    const handleProceedToPayment = async () => {
        if (!selectedSession || !selectedModule) return;
        
        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.functions.invoke('payment', {
                body: { 
                    service_id: selectedModule.id,
                    amount_cents: selectedSession.price_cents,
                    type: paymentMethod === 'card' ? 'payment' : 'setup'
                }
            });

            if (error || !data?.client_secret) {
                showToast('Could not initialize payment. Please try again.', 'error');
                return;
            }

            setClientSecret(data.client_secret);
            setStep('payment');
        } catch (e) {
            showToast('An error occurred initializing payment.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePaymentSuccess = async (intentId: string) => {
        if (!selectedSession || !selectedDate) return;
        
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/sessions/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: selectedSession.id,
                    module_id: selectedSession.module_id,
                    date: selectedDate,
                    time: selectedSession.start_time,
                    payment_intent_id: paymentMethod === 'card' ? intentId : undefined,
                    setup_intent_id: paymentMethod === 'cash' ? intentId : undefined,
                    payment_method: paymentMethod,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                showToast(data.error || 'Failed to book session.', 'error');
                return;
            }

            setStep('confirmed');
        } catch (e) {
            showToast('Failed to complete booking. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`;

    const getSessionTypeLabel = (type: string) => {
        switch (type) {
            case 'private': return '1-on-1 Private';
            case 'paired': return '2 Students';
            case 'group': return 'Group Session';
            default: return type;
        }
    };

    const handleBookAnother = () => {
        setStep('module');
        setSelectedModule(null);
        setSelectedDate(null);
        setSelectedSession(null);
        setClientSecret(null);
    };

    if (authLoading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center text-zinc-500">
                <div className="animate-pulse">Checking access...</div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-2xl mx-auto"
        >
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl">
                {/* Gradient glow */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />

                <div className="relative z-10 p-6 md:p-8">
                    {/* Progress indicator */}
                    {step !== 'confirmed' && (
                        <div className="flex items-center gap-2 mb-6">
                            {['module', 'date', 'session', 'review', 'payment'].map((s, i) => (
                                <div key={s} className="flex items-center">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                                        step === s ? "bg-white text-black" :
                                        ['module', 'date', 'session', 'review', 'payment'].indexOf(step) > i 
                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                            : "bg-white/5 text-zinc-500 border border-white/10"
                                    )}>
                                        {['module', 'date', 'session', 'review', 'payment'].indexOf(step) > i 
                                            ? <Check className="w-4 h-4" /> 
                                            : i + 1}
                                    </div>
                                    {i < 4 && (
                                        <div className={cn(
                                            "w-8 h-0.5 mx-1",
                                            ['module', 'date', 'session', 'review', 'payment'].indexOf(step) > i 
                                                ? "bg-green-500/30" 
                                                : "bg-white/10"
                                        )} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {/* Step 1: Module Selection */}
                        {step === 'module' && (
                            <motion.div
                                key="module"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Select Training Module</h2>
                                    <p className="text-zinc-400 text-sm">Choose the type of training you need.</p>
                                </div>

                                {loadingModules ? (
                                    <div className="py-12 text-center text-zinc-500 animate-pulse">
                                        Loading training modules...
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {modules.map((module) => {
                                            const config = moduleConfig[module.module_type];
                                            const Icon = config?.icon || Truck;
                                            
                                            return (
                                                <button
                                                    key={module.id}
                                                    onClick={() => handleModuleSelect(module)}
                                                    className={cn(
                                                        "group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 text-left",
                                                        selectedModule?.id === module.id
                                                            ? "bg-white text-black border-white shadow-lg shadow-white/10"
                                                            : `${config?.bgColor} ${config?.borderColor} hover:bg-white/10`
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                                                        selectedModule?.id === module.id
                                                            ? "bg-black/10"
                                                            : `bg-gradient-to-br ${config?.color}`
                                                    )}>
                                                        <Icon className={cn(
                                                            "w-6 h-6",
                                                            selectedModule?.id === module.id ? "text-black" : "text-white"
                                                        )} />
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h3 className={cn(
                                                                "font-bold text-lg",
                                                                selectedModule?.id === module.id ? "text-black" : "text-white"
                                                            )}>
                                                                {module.name}
                                                            </h3>
                                                            <span className={cn(
                                                                "font-bold text-xl",
                                                                selectedModule?.id === module.id ? "text-black" : "text-white"
                                                            )}>
                                                                {formatPrice(module.price_cents)}
                                                            </span>
                                                        </div>
                                                        
                                                        <p className={cn(
                                                            "text-sm mb-2",
                                                            selectedModule?.id === module.id ? "text-black/70" : "text-zinc-400"
                                                        )}>
                                                            {config?.description || module.description}
                                                        </p>
                                                        
                                                        <div className="flex items-center gap-4 text-xs">
                                                            <span className={cn(
                                                                "flex items-center gap-1",
                                                                selectedModule?.id === module.id ? "text-black/60" : "text-zinc-500"
                                                            )}>
                                                                <Clock className="w-3 h-3" />
                                                                {module.duration_min} min
                                                            </span>
                                                            <span className={cn(
                                                                "flex items-center gap-1",
                                                                selectedModule?.id === module.id ? "text-black/60" : "text-zinc-500"
                                                            )}>
                                                                <Users className="w-3 h-3" />
                                                                {module.capacity === 1 ? 'Private' : 
                                                                 module.capacity === 2 ? 'Paired' : 
                                                                 `Up to ${module.capacity}`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    {selectedModule?.id === module.id && (
                                                        <div className="absolute top-4 right-4">
                                                            <Check className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                <button
                                    disabled={!selectedModule}
                                    onClick={() => setStep('date')}
                                    className={cn(
                                        "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                                        selectedModule
                                            ? "bg-white text-black hover:scale-[1.02] shadow-lg"
                                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                    )}
                                >
                                    Select Date <ChevronRight className="w-5 h-5" />
                                </button>
                            </motion.div>
                        )}

                        {/* Step 2: Date Selection */}
                        {step === 'date' && (
                            <motion.div
                                key="date"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Select Training Date</h2>
                                    <p className="text-zinc-400 text-sm">Training is available on weekends only.</p>
                                </div>

                                {loadingDates ? (
                                    <div className="py-12 text-center text-zinc-500 animate-pulse">
                                        Loading available dates...
                                    </div>
                                ) : trainingDates.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                                        <p className="text-zinc-400">No training dates available.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-2">
                                        {trainingDates.map((dateObj) => {
                                            const d = new Date(dateObj.date + 'T12:00:00');
                                            const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                            
                                            return (
                                                <button
                                                    key={dateObj.date}
                                                    onClick={() => handleDateSelect(dateObj.date)}
                                                    disabled={!dateObj.hasAvailability}
                                                    className={cn(
                                                        "p-4 rounded-xl border transition-all text-center",
                                                        !dateObj.hasAvailability
                                                            ? "bg-zinc-900/50 border-zinc-800 text-zinc-600 cursor-not-allowed"
                                                            : selectedDate === dateObj.date
                                                                ? "bg-white text-black border-white"
                                                                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                                                    )}
                                                >
                                                    <div className="text-xs font-medium uppercase tracking-wider opacity-70">
                                                        {dateObj.dayOfWeek}
                                                    </div>
                                                    <div className="text-lg font-bold mt-1">
                                                        {monthDay}
                                                    </div>
                                                    {dateObj.hasSessions && dateObj.sessionsCount && (
                                                        <div className={cn(
                                                            "text-xs mt-1",
                                                            selectedDate === dateObj.date ? "text-black/60" : "text-green-400"
                                                        )}>
                                                            {dateObj.sessionsCount} session{dateObj.sessionsCount > 1 ? 's' : ''}
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep('module')}
                                        className="px-6 py-4 rounded-xl font-bold text-zinc-400 hover:bg-white/5 transition"
                                    >
                                        Back
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Session Selection */}
                        {step === 'session' && (
                            <motion.div
                                key="session"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Select Time Slot</h2>
                                    <p className="text-zinc-400 text-sm">
                                        {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { 
                                            weekday: 'long', month: 'long', day: 'numeric' 
                                        })}
                                    </p>
                                </div>

                                {loadingSessions ? (
                                    <div className="py-12 text-center text-zinc-500 animate-pulse">
                                        Loading available sessions...
                                    </div>
                                ) : sessions.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                                        <p className="text-zinc-400">No sessions available for this date.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                        {sessions.map((session, idx) => {
                                            const spotsLeft = session.capacity - session.current_capacity;
                                            const config = moduleConfig[session.module_type];
                                            
                                            return (
                                                <button
                                                    key={session.id || idx}
                                                    onClick={() => handleSessionSelect(session)}
                                                    className={cn(
                                                        "w-full p-4 rounded-xl border transition-all text-left",
                                                        selectedSession === session
                                                            ? "bg-white text-black border-white"
                                                            : "bg-white/5 border-white/10 hover:bg-white/10"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={cn(
                                                            "text-lg font-bold",
                                                            selectedSession === session ? "text-black" : "text-white"
                                                        )}>
                                                            {session.start_time} - {session.end_time}
                                                        </span>
                                                        <span className={cn(
                                                            "font-bold",
                                                            selectedSession === session ? "text-black" : "text-white"
                                                        )}>
                                                            {formatPrice(session.price_cents)}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        {session.is_fixed && (
                                                            <span className={cn(
                                                                "text-xs px-2 py-1 rounded-full",
                                                                selectedSession === session 
                                                                    ? "bg-black/10 text-black"
                                                                    : "bg-emerald-500/20 text-emerald-400"
                                                            )}>
                                                                Fixed Session
                                                            </span>
                                                        )}
                                                        <span className={cn(
                                                            "text-xs px-2 py-1 rounded-full",
                                                            selectedSession === session 
                                                                ? "bg-black/10 text-black"
                                                                : "bg-white/10 text-zinc-400"
                                                        )}>
                                                            {getSessionTypeLabel(session.session_type)}
                                                        </span>
                                                        {spotsLeft > 0 && session.capacity > 1 && (
                                                            <span className={cn(
                                                                "text-xs",
                                                                selectedSession === session ? "text-black/60" : "text-zinc-500"
                                                            )}>
                                                                {spotsLeft} spot{spotsLeft > 1 ? 's' : ''} left
                                                            </span>
                                                        )}
                                                        {session.is_new && (
                                                            <span className={cn(
                                                                "text-xs",
                                                                selectedSession === session ? "text-black/60" : "text-blue-400"
                                                            )}>
                                                                + New session
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setStep('date'); setSelectedSession(null); }}
                                        className="px-6 py-4 rounded-xl font-bold text-zinc-400 hover:bg-white/5 transition"
                                    >
                                        Back
                                    </button>
                                    <button
                                        disabled={!selectedSession}
                                        onClick={() => setStep('review')}
                                        className={cn(
                                            "flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                                            selectedSession
                                                ? "bg-white text-black hover:scale-[1.02]"
                                                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                        )}
                                    >
                                        Review Booking <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 4: Review */}
                        {step === 'review' && selectedSession && selectedModule && (
                            <motion.div
                                key="review"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Review Booking</h2>
                                    <p className="text-zinc-400 text-sm">Confirm your training session details.</p>
                                </div>

                                {/* Summary Card */}
                                <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-zinc-400">Module</span>
                                        <span className="font-bold text-white">{selectedModule.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-zinc-400">Date</span>
                                        <span className="font-bold text-white">
                                            {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                                                weekday: 'long', month: 'long', day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-zinc-400">Time</span>
                                        <span className="font-bold text-white">
                                            {selectedSession.start_time} - {selectedSession.end_time}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-zinc-400">Session Type</span>
                                        <span className="font-bold text-white">
                                            {getSessionTypeLabel(selectedSession.session_type)}
                                        </span>
                                    </div>
                                    <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                                        <span className="text-zinc-400">Total</span>
                                        <span className="font-bold text-2xl text-emerald-400">
                                            {formatPrice(selectedSession.price_cents)}
                                        </span>
                                    </div>
                                </div>

                                {/* Important Notes */}
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-amber-200/80">
                                            <p className="font-semibold text-amber-200 mb-1">Please Note:</p>
                                            <ul className="list-disc list-inside space-y-1">
                                                <li>Arrive 10 minutes before your session</li>
                                                <li>Late arrival does not extend session time</li>
                                                <li>Bring valid ID and comfortable clothing</li>
                                                {selectedModule.module_type !== 'pretrip' && (
                                                    <li>Wear closed-toe shoes for driving</li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Method Toggle */}
                                <div className="flex bg-white/5 p-1 rounded-xl">
                                    <button
                                        onClick={() => setPaymentMethod('card')}
                                        className={cn(
                                            "flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2",
                                            paymentMethod === 'card' 
                                                ? "bg-blue-600 text-white" 
                                                : "text-zinc-400 hover:text-white"
                                        )}
                                    >
                                        <CreditCard className="w-4 h-4" /> Pay Now
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('cash')}
                                        className={cn(
                                            "flex-1 py-3 text-sm font-bold rounded-lg transition-all",
                                            paymentMethod === 'cash' 
                                                ? "bg-emerald-600 text-white" 
                                                : "text-zinc-400 hover:text-white"
                                        )}
                                    >
                                        Pay Cash (Requires Card on File)
                                    </button>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep('session')}
                                        className="px-6 py-4 rounded-xl font-bold text-zinc-400 hover:bg-white/5 transition"
                                    >
                                        Back
                                    </button>
                                    <button
                                        disabled={isSubmitting}
                                        onClick={handleProceedToPayment}
                                        className={cn(
                                            "flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                                            paymentMethod === 'card'
                                                ? "bg-blue-600 text-white hover:bg-blue-500"
                                                : "bg-emerald-600 text-white hover:bg-emerald-500"
                                        )}
                                    >
                                        {isSubmitting ? 'Processing...' : (
                                            <>Proceed to Payment <ChevronRight className="w-5 h-5" /></>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 5: Payment */}
                        {step === 'payment' && clientSecret && (
                            <motion.div
                                key="payment"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-white mb-2">Payment</h2>
                                    <p className="text-zinc-400 text-sm">
                                        {paymentMethod === 'card' 
                                            ? 'Complete your payment securely.' 
                                            : 'Add a card for no-show protection.'}
                                    </p>
                                </div>
                                
                                <Elements
                                    key={clientSecret}
                                    stripe={stripePromise}
                                    options={{
                                        clientSecret,
                                        appearance: { theme: 'night', labels: 'floating' },
                                    }}
                                >
                                    <PaymentForm
                                        amountDisplay={selectedSession ? formatPrice(selectedSession.price_cents) : ''}
                                        onSuccess={handlePaymentSuccess}
                                        onCancel={() => {
                                            setStep('review');
                                            setClientSecret(null);
                                        }}
                                        mode={paymentMethod === 'card' ? 'payment' : 'setup'}
                                    />
                                </Elements>
                            </motion.div>
                        )}

                        {/* Step 6: Confirmed */}
                        {step === 'confirmed' && (
                            <motion.div
                                key="confirmed"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-8"
                            >
                                <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Check className="w-10 h-10" />
                                </div>
                                
                                <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
                                <p className="text-zinc-400 mb-6">
                                    Your training session has been scheduled.
                                </p>

                                {selectedSession && selectedDate && (
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-left">
                                        <div className="text-sm space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Module</span>
                                                <span className="text-white font-medium">{selectedModule?.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Date</span>
                                                <span className="text-white font-medium">
                                                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                                                        weekday: 'short', month: 'short', day: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Time</span>
                                                <span className="text-white font-medium">
                                                    {selectedSession.start_time} - {selectedSession.end_time}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleBookAnother}
                                        className="w-full py-4 bg-white text-black font-bold rounded-xl hover:scale-[1.02] transition"
                                    >
                                        Book Another Session
                                    </button>
                                    <a
                                        href="/bookings"
                                        className="w-full py-4 bg-white/5 border border-white/10 text-zinc-400 font-bold rounded-xl hover:bg-white/10 transition text-center"
                                    >
                                        View My Bookings
                                    </a>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />
        </motion.div>
    );
}
