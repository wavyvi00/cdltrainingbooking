'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, XCircle } from 'lucide-react';

interface ReasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    title: string;
    description: string;
    confirmLabel: string;
    confirmVariant: 'danger' | 'warning';
    isLoading?: boolean;
}

export function ReasonModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel,
    confirmVariant,
    isLoading = false
}: ReasonModalProps) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            setReason('');
            setError('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleConfirm = () => {
        if (!reason.trim()) {
            setError('A reason is required.');
            return;
        }
        onConfirm(reason.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.metaKey) {
            handleConfirm();
        }
        if (e.key === 'Escape') {
            onClose();
        }
    };

    const variantStyles = {
        danger: {
            icon: XCircle,
            iconBg: 'bg-red-500/20',
            iconColor: 'text-red-400',
            button: 'bg-red-600 hover:bg-red-500 text-white',
        },
        warning: {
            icon: AlertTriangle,
            iconBg: 'bg-orange-500/20',
            iconColor: 'text-orange-400',
            button: 'bg-orange-600 hover:bg-orange-500 text-white',
        }
    };

    const styles = variantStyles[confirmVariant];
    const Icon = styles.icon;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="p-6 pb-0">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 ${styles.iconBg} rounded-full flex items-center justify-center shrink-0`}>
                                        <Icon className={`w-6 h-6 ${styles.iconColor}`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white">{title}</h3>
                                        <p className="text-sm text-zinc-400 mt-1">{description}</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    Reason <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    ref={inputRef}
                                    value={reason}
                                    onChange={(e) => {
                                        setReason(e.target.value);
                                        setError('');
                                    }}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Enter the reason..."
                                    rows={3}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 transition-all resize-none"
                                />
                                {error && (
                                    <p className="text-red-400 text-sm mt-2">{error}</p>
                                )}
                                <p className="text-xs text-zinc-500 mt-2">
                                    Press ⌘+Enter to confirm
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="p-6 pt-0 flex gap-3">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-zinc-300 font-medium rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={isLoading || !reason.trim()}
                                    className={`flex-1 px-4 py-3 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles.button}`}
                                >
                                    {isLoading ? 'Processing...' : confirmLabel}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
