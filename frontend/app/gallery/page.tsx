'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FloatingHeader } from '@/components/FloatingHeader';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface GalleryImage {
    id: string;
    image_url: string;
    caption?: string;
    created_at?: string;
}

export default function GalleryPage() {
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchImages = async () => {
            try {
                const res = await fetch('/api/gallery');
                const data = await res.json();
                if (res.ok && data.images) {
                    setImages(data.images);
                }
            } catch (error) {
                console.error('Failed to load gallery images', error);
            } finally {
                setLoading(false);
            }
        };

        fetchImages();
    }, []);

    return (
        <main className="min-h-screen text-white relative overflow-x-hidden">

            {/* Navigation */}
            <div className="fixed top-0 left-0 right-0 z-50 p-6 pointer-events-none">
                <div className="pointer-events-auto inline-block">
                    <Link href="/" className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-wider backdrop-blur-md bg-black/20 px-4 py-2 rounded-full border border-white/5">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                </div>
            </div>



            {/* Header */}
            <div className="relative pt-40 pb-20 px-6 text-center z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6">
                        THE <span className="text-zinc-700">GALLERY</span>
                    </h1>
                    <p className="text-zinc-400 max-w-2xl mx-auto text-lg leading-relaxed">
                        Explore our portfolio of signature cuts. Every image represents a tailored experience.
                    </p>
                </motion.div>
            </div>

            {/* Gallery Grid */}
            <div className="container mx-auto px-6 pb-32 relative z-10">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="aspect-[4/5] bg-white/5 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : images.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
                        {images.map((img, index) => (
                            <motion.div
                                key={img.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                                className="group relative overflow-hidden rounded-2xl bg-zinc-900 aspect-[4/5] border border-white/5"
                            >
                                <img
                                    src={img.image_url}
                                    alt={img.caption || "Barber work"}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-8">
                                    <p className="text-white font-bold text-lg translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                        {img.caption || 'Royal Cut'}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                        {/* @ts-ignore */}
                        <iconify-icon icon="ph:image-slash-light" width="48" style={{ color: '#52525b' }}></iconify-icon>
                        <p className="text-zinc-500 mt-4">No images uploaded yet.</p>
                    </div>
                )}
            </div>

            {/* Footer Lite */}
            <footer className="py-12 border-t border-white/5 text-center bg-transparent">
                <div className="text-xs text-zinc-700">
                    © {new Date().getFullYear()} RoyCuts. All rights reserved.
                </div>
            </footer>
        </main>
    );
}
