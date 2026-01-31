'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export function Hero() {

    return (
        <section className="relative min-h-[110vh] flex items-center justify-center overflow-hidden bg-transparent selection:bg-indigo-500/30 pointer-events-none">
            {/* Content Container - Pointer events auto to enable clicks */}
            <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center min-h-[80vh] pointer-events-auto">

                {/* Left Side: Brand & Copy */}
                <div className="text-center lg:text-left space-y-8 select-none pt-20 lg:pt-0">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        <h1 className="text-6xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-600 tracking-tighter mb-4 drop-shadow-2xl">
                            ROYCUTS
                        </h1>
                        <p className="text-lg md:text-xl text-zinc-400 font-normal leading-relaxed max-w-lg mx-auto lg:mx-0">
                            The architecture of grooming. <br />
                            <span className="text-indigo-400">Precision. Privacy. Premium.</span>
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="hidden lg:flex items-center gap-6 justify-center lg:justify-start"
                    >
                        <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 uppercase tracking-widest backdrop-blur-md">
                            Accepting New Clients
                        </div>
                    </motion.div>
                </div>

                {/* Right Side: Booking Widget */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 1 }}
                    className="flex justify-center lg:justify-end"
                >
                    <Link href="/book" className="group relative px-8 py-5 bg-white text-black font-black text-lg uppercase tracking-widest rounded-full overflow-hidden hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                        <span className="relative z-10 flex items-center gap-2">
                            Book Now <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    </Link>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                animate={{ opacity: [0, 1, 0], y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 text-zinc-600 z-10"
            >
                <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-zinc-500 to-transparent" />
            </motion.div>
        </section>
    );
}
