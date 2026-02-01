import { CDLBookingWidget } from '@/components/CDLBookingWidget';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Book Training | Florida CDL Training',
    description: 'Book your CDL training session - Road Training, Backing Practice, or Pre-Trip Inspection',
};

export default function CDLBookPage() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Background effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-10">
                    <a href="/" className="inline-block mb-6">
                        <h1 className="text-3xl font-bold text-white">
                            Florida CDL <span className="text-blue-400">Training</span>
                        </h1>
                    </a>
                    <p className="text-zinc-400 max-w-md mx-auto">
                        Weekend training sessions for aspiring commercial drivers.
                        Quality instruction, flexible scheduling.
                    </p>
                </div>

                {/* Booking Widget */}
                <CDLBookingWidget />

                {/* Footer info */}
                <div className="mt-12 text-center">
                    <p className="text-zinc-500 text-sm">
                        Questions? Call <a href="tel:+15551234567" className="text-blue-400 hover:underline">(555) 123-4567</a>
                    </p>
                </div>
            </div>
        </main>
    );
}
