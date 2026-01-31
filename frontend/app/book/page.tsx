'use client';

import { BookingWidget } from '@/components/BookingWidget';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function BookPage() {
    return (
        <main className="min-h-screen text-white flex flex-col relative overflow-x-hidden">

            {/* Navigation */}
            <div className="relative z-20 p-6">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-wider backdrop-blur-md bg-white/5 px-4 py-2 rounded-full border border-white/5 hover:bg-white/10">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
            </div>

            {/* Content centered */}
            <div className="relative z-10 flex-1 flex flex-col items-center p-6 py-12 md:py-20">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-600 tracking-tighter mb-2">
                            BOOK YOUR SESSION
                        </h1>
                        <p className="text-zinc-500 text-sm">Select a service and time below</p>
                    </div>

                    <BookingWidget />
                </div>
            </div>
        </main>
    );
}
