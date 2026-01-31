'use client';

import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Check } from 'lucide-react';

interface PaymentFormProps {
    onSuccess: (intentId: string) => void;
    onCancel: () => void;
    amountDisplay: string;
    mode: 'payment' | 'setup';
}

export function PaymentForm({ onSuccess, onCancel, amountDisplay, mode }: PaymentFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);

        // 1. Submit the element (validates input)
        const { error: submitError } = await elements.submit();
        if (submitError) {
            setErrorMessage(submitError.message || "Please check your payment details.");
            setIsProcessing(false);
            return;
        }

        // 2. Confirm Payment or Setup
        if (mode === 'payment') {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                redirect: 'if_required',
                confirmParams: {
                    return_url: window.location.origin + '/book',
                },
            });

            if (error) {
                setErrorMessage(error.message || "Payment failed.");
                setIsProcessing(false);
            } else if (paymentIntent && (paymentIntent.status === 'requires_capture' || paymentIntent.status === 'succeeded')) {
                onSuccess(paymentIntent.id);
            } else {
                setErrorMessage("Unexpected payment status.");
                setIsProcessing(false);
            }
        } else {
            // Setup Mode (Cash)
            const { error, setupIntent } = await stripe.confirmSetup({
                elements,
                redirect: 'if_required',
                confirmParams: {
                    return_url: window.location.origin + '/book',
                },
            });

            if (error) {
                setErrorMessage(error.message || "Setup failed.");
                setIsProcessing(false);
            } else if (setupIntent && setupIntent.status === 'succeeded') {
                onSuccess(setupIntent.id);
            } else {
                setErrorMessage("Unexpected setup status.");
                setIsProcessing(false);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 mb-6">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-400" />
                    Secure Payment
                </h3>
                <p className="text-zinc-400 text-sm">
                    {mode === 'payment'
                        ? <>A temporary hold of <span className="text-white font-bold">{amountDisplay}</span> will be placed on your card. You will only be charged when the appointment is accepted.</>
                        : <>Enter your card to hold your spot. <span className="text-white font-bold">You will not be charged today.</span> Pay cash at your appointment. A fee may apply for no-shows.</>
                    }
                </p>
            </div>

            <PaymentElement
                options={{
                    layout: 'accordion',
                    paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
                    // Hide wallet options for Setup mode if desired, or keep them.
                }}
            />

            {errorMessage && (
                <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                    {errorMessage}
                </div>
            )}

            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isProcessing}
                    className="px-6 py-4 rounded-lg font-bold text-sm uppercase tracking-widest text-zinc-400 hover:bg-white/5 transition-colors"
                >
                    Back
                </button>
                <button
                    type="submit"
                    disabled={!stripe || isProcessing}
                    className="flex-1 py-4 rounded-lg font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_25px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isProcessing
                        ? 'Processing...'
                        : mode === 'payment' ? `Hold ${amountDisplay}` : 'Secure Spot (No Charge)'
                    } <Check className="w-4 h-4" />
                </button>
            </div>
        </form>
    );
}
