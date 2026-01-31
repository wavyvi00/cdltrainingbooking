'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Badge } from './shared/Badge';

export const Hero: React.FC<{ stats?: any }> = ({ stats }) => {
    // Default / Public Fallback
    const nextAvailable = stats?.nextAvailable || "Availability Check";
    const nextAppt = stats?.nextAppointment; // Admin only
    const bookedToday = stats?.bookedToday || "100%";
    const isAdmin = stats?.isAdmin;

    return (
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
            {/* Background Gradient/Mesh for Hero specifically */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">

                {/* Left: Text Content */}
                <div className="text-center lg:text-left space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <Badge variant="brand" className="mb-6">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Accepting New Clients
                        </Badge>

                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white mb-6 leading-[0.9]">
                            Roycuts <br />
                            <span className="text-white/20">Barbershop</span>
                        </h1>

                        <p className="text-lg text-zinc-400 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                            Experience the architecture of grooming. A private, appointment-only studio dedicated to detail, hygiene, and your personal style.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
                    >
                        <Link href="/book" className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold text-sm uppercase tracking-widest hover:scale-105 transition-transform rounded-full text-center">
                            Book Appointment
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="flex items-center gap-6 justify-center lg:justify-start text-xs font-medium text-zinc-500 uppercase tracking-wider"
                    >
                        <div className="flex items-center gap-2">
                            {/* @ts-ignore */}
                            <iconify-icon icon="ph:scissors-light" width="18"></iconify-icon>
                            <span>Precision Cut</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* @ts-ignore */}
                            <iconify-icon icon="ph:shield-check-light" width="18"></iconify-icon>
                            <span>Private Studio</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* @ts-ignore */}
                            <iconify-icon icon="ph:star-four-light" width="18"></iconify-icon>
                            <span>5-Star Rated</span>
                        </div>
                    </motion.div>
                </div>

                {/* Right: Decorative/Abstract UI */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 1 }}
                    className="relative hidden lg:block"
                >
                    {/* Abstract Card Setup */}
                    <div className="relative w-full aspect-square max-w-lg mx-auto">
                        {/* Main "Image" Card placeholder - using a gradient block to simulate a high-end image container */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900 to-zinc-800 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center opacity-60 mix-blend-overlay" />

                            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent">
                                <div className="flex items-center justify-between">
                                    {isAdmin ? (
                                        <div>
                                            <p className="text-zinc-400 text-xs">Next Appointment</p>
                                            <p className="text-white font-mono">{nextAppt || "Free"}</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-zinc-400 text-xs">Next Available</p>
                                            <p className="text-white font-mono">{nextAvailable}</p>
                                        </div>
                                    )}

                                    <div className="h-10 w-10 rounded-full border border-white/20 flex items-center justify-center">
                                        {/* @ts-ignore */}
                                        <iconify-icon icon="ph:arrow-right-light"></iconify-icon>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Metric Card 1 */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-6 -right-6 p-4 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl shadow-xl w-48"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                <span className="text-xs text-zinc-400 uppercase">
                                    {isAdmin ? "Today's Status" : "Studio Status"}
                                </span>
                            </div>

                            {/* If Admin, show Utilization. If Public, show "Open" or simple stat */}
                            {isAdmin ? (
                                <>
                                    <div className="text-2xl font-mono text-white">{bookedToday}</div>
                                    <div className="text-[10px] text-zinc-500 mt-1">Bookings Today</div>
                                </>
                            ) : (
                                <>
                                    <div className="text-2xl font-mono text-white">Open</div>
                                    <div className="text-[10px] text-zinc-500 mt-1">Accepting Clients</div>
                                </>
                            )}

                        </motion.div>

                        {/* Floating Metric Card 2 */}
                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute -bottom-8 -left-8 p-4 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-xl shadow-xl"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/5 rounded-lg text-white">
                                    {/* @ts-ignore */}
                                    <iconify-icon icon="ph:users-three-light" width="24"></iconify-icon>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">Client Club</div>
                                    <div className="text-xs text-zinc-500">Member Exclusive</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
