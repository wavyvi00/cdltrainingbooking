'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, isVisible, onClose, duration = 3000, type = 'success' }: ToastProps & { type?: 'success' | 'error' }) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    const isSuccess = type === 'success';

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className={cn(
                        "fixed bottom-6 right-6 z-[100] flex items-center gap-3 border shadow-2xl p-4 rounded-xl pr-10",
                        isSuccess
                            ? "bg-zinc-900 border-white/10"
                            : "bg-red-950/90 border-red-500/20"
                    )}
                >
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isSuccess ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                    )}>
                        {isSuccess ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div>
                        <p className={cn("font-bold text-sm", isSuccess ? "text-white" : "text-red-100")}>
                            {isSuccess ? "Success" : "Error"}
                        </p>
                        <p className={cn("text-xs", isSuccess ? "text-zinc-400" : "text-red-200/80")}>{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className={cn(
                            "absolute top-4 right-4 transition-colors",
                            isSuccess ? "text-zinc-500 hover:text-white" : "text-red-300 hover:text-white"
                        )}
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Progress bar */}
                    <motion.div
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: duration / 1000, ease: "linear" }}
                        className={cn(
                            "absolute bottom-0 left-0 h-1 rounded-b-xl",
                            isSuccess ? "bg-green-500/30" : "bg-red-500/30"
                        )}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}
