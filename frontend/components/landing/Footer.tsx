'use client';

import React from 'react';
import Link from 'next/link';
import { Truck, Phone, Mail, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
    return (
        <footer className="py-20 border-t border-white/5 bg-black relative z-10">
            <div className="container mx-auto px-6">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <Link href="/" className="inline-block mb-4">
                            <h2 className="text-2xl font-black text-white tracking-tighter">
                                Florida CDL <span className="text-blue-400">Training</span>
                            </h2>
                        </Link>
                        <p className="text-zinc-500 text-sm mb-6 max-w-sm leading-relaxed">
                            Professional CDL training for aspiring commercial drivers.
                            Weekend classes, experienced instructors, and high pass rates.
                        </p>
                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                            <Truck className="w-4 h-4 text-blue-400" />
                            <span>Behind-the-wheel training since 2020</span>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Training</h3>
                        <ul className="space-y-3 text-sm">
                            <li>
                                <Link href="/training/book" className="text-zinc-400 hover:text-white transition-colors">
                                    Book a Session
                                </Link>
                            </li>
                            <li>
                                <Link href="#modules" className="text-zinc-400 hover:text-white transition-colors">
                                    Training Modules
                                </Link>
                            </li>
                            <li>
                                <Link href="#why-us" className="text-zinc-400 hover:text-white transition-colors">
                                    Why Train With Us
                                </Link>
                            </li>
                            <li>
                                <Link href="/enroll" className="text-zinc-400 hover:text-white transition-colors">
                                    Enrollment Info
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Contact</h3>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-2 text-zinc-400">
                                <Phone className="w-4 h-4 text-blue-400" />
                                <a href="tel:+15551234567" className="hover:text-white transition-colors">
                                    (555) 123-4567
                                </a>
                            </li>
                            <li className="flex items-center gap-2 text-zinc-400">
                                <Mail className="w-4 h-4 text-blue-400" />
                                <a href="mailto:info@floridacdltraining.com" className="hover:text-white transition-colors">
                                    info@floridacdltraining.com
                                </a>
                            </li>
                            <li className="flex items-start gap-2 text-zinc-400">
                                <MapPin className="w-4 h-4 text-blue-400 mt-0.5" />
                                <span>Central Florida Area</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-zinc-700">
                        © {new Date().getFullYear()} Florida CDL Training. All rights reserved.
                    </div>
                    <div className="flex gap-6 text-xs text-zinc-600">
                        <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};
