'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Badge } from './shared/Badge';
import { Truck, Shield, Calendar, Award, Users, Clock } from 'lucide-react';

export const Hero: React.FC<{ stats?: any }> = ({ stats }) => {
    const nextAvailable = stats?.nextAvailable || "This Weekend";
    const isAdmin = stats?.isAdmin;

    return (
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.1),transparent_50%)] pointer-events-none" />

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
                            Now Enrolling Students
                        </Badge>

                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white mb-6 leading-[0.9]">
                            Florida CDL <br />
                            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 text-transparent bg-clip-text">Training</span>
                        </h1>

                        <p className="text-lg text-zinc-400 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                            Get your Commercial Driver's License with expert weekend training.
                            Flexible scheduling, hands-on instruction, and high pass rates.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
                    >
                        <Link
                            href="/training/book"
                            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-sm uppercase tracking-widest hover:scale-105 transition-transform rounded-full text-center shadow-lg shadow-blue-500/25"
                        >
                            Book Training Session
                        </Link>
                        <Link
                            href="#modules"
                            className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white font-bold text-sm uppercase tracking-widest hover:bg-white/10 transition-colors rounded-full text-center"
                        >
                            View Modules
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="flex items-center gap-6 justify-center lg:justify-start text-xs font-medium text-zinc-500 uppercase tracking-wider"
                    >
                        <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-blue-400" />
                            <span>Behind-the-Wheel</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-400" />
                            <span>Licensed Instructors</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-400" />
                            <span>Weekend Classes</span>
                        </div>
                    </motion.div>
                </div>

                {/* Right: Decorative UI */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 1 }}
                    className="relative hidden lg:block"
                >
                    <div className="relative w-full aspect-square max-w-lg mx-auto">
                        {/* Main Card with truck image */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900 to-zinc-800 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-60 mix-blend-overlay" />

                            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-zinc-400 text-xs">Next Training Session</p>
                                        <p className="text-white font-mono text-lg">{nextAvailable}</p>
                                    </div>
                                    <Link
                                        href="/training/book"
                                        className="h-12 w-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition"
                                    >
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Floating Metric Card 1 - Pass Rate */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-6 -right-6 p-4 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl shadow-xl w-48"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-xs text-zinc-400 uppercase">Pass Rate</span>
                            </div>
                            <div className="text-3xl font-mono font-bold text-emerald-400">95%</div>
                            <div className="text-[10px] text-zinc-500 mt-1">First-time testers</div>
                        </motion.div>

                        {/* Floating Metric Card 2 - Training Info */}
                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute -bottom-8 -left-8 p-4 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-xl shadow-xl"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">Small Classes</div>
                                    <div className="text-xs text-zinc-500">1-on-1 & Group Options</div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Floating Card 3 - Schedule */}
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                            className="absolute top-1/2 -right-12 p-3 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-xl shadow-xl"
                        >
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-amber-400" />
                                <div>
                                    <div className="text-xs font-bold text-white">Sat & Sun</div>
                                    <div className="text-[10px] text-zinc-500">8 AM - 5 PM</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
