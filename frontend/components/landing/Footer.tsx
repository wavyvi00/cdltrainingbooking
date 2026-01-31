'use client';

import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
    return (
        <footer className="py-20 border-t border-white/5 bg-black text-center relative z-10">
            <div className="container mx-auto px-6 flex flex-col items-center">
                <Link href="/" className="mb-6">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter hover:text-white/80 transition-colors">
                        ROYCUTS
                    </h2>
                </Link>

                <p className="text-zinc-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                    Precision barbering for the modern gentleman. Located in the heart of the city.
                </p>



                <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-zinc-400 font-medium tracking-wide uppercase mb-12">
                    <Link href="/book" className="hover:text-white transition-colors">Book Now</Link>
                    <Link href="#services" className="hover:text-white transition-colors">Services</Link>
                    <Link href="#" className="hover:text-white transition-colors">Studio</Link>
                </div>

                <div className="text-xs text-zinc-700">
                    © {new Date().getFullYear()} RoyCuts. All rights reserved.
                </div>
            </div>
        </footer>
    );
};
