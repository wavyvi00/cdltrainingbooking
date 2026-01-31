'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { useEffect } from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false,
    isLoading = false
}: ConfirmationModalProps) {
    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

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
                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-full ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-zinc-100/10 text-white'}`}>
                                        <AlertCircle className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                                        <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-zinc-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="bg-white/5 px-6 py-4 flex items-center justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={isLoading}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDestructive
                                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                                            : 'bg-white hover:bg-zinc-200 text-black'
                                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? 'Processing...' : confirmText}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
