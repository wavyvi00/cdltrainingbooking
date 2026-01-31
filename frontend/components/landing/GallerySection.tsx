'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Section } from './shared/Section';
import { motion } from 'framer-motion';

interface GalleryImage {
    id: string;
    image_url: string;
    caption?: string;
    created_at?: string;
}

export const GallerySection: React.FC = () => {
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchImages = async () => {
            try {
                const res = await fetch('/api/gallery');
                const data = await res.json();
                if (res.ok && data.images) {
                    // Take only the first 6 for the landing page
                    setImages(data.images.slice(0, 6));
                }
            } catch (error) {
                console.error('Failed to load gallery images', error);
            } finally {
                setLoading(false);
            }
        };

        fetchImages();
    }, []);

    if (!loading && images.length === 0) return null;

    return (
        <Section className="bg-transparent" id="gallery">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                        LATEST <span className="text-zinc-600">WORK</span>
                    </h2>
                    <p className="text-zinc-400 max-w-md">
                        A showcase of precision and style. Browse our recent cuts and transformations.
                    </p>
                </div>
                <Link
                    href="/gallery"
                    className="group flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white hover:text-indigo-400 transition-colors"
                >
                    View Full Gallery
                    {/* @ts-ignore */}
                    <iconify-icon icon="ph:arrow-right" class="group-hover:translate-x-1 transition-transform"></iconify-icon>
                </Link>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="aspect-[4/5] bg-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {images.map((img, index) => (
                        <motion.div
                            key={img.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className="group relative overflow-hidden rounded-2xl bg-zinc-900 aspect-[4/5] border border-white/5"
                        >
                            <img
                                src={img.image_url}
                                alt={img.caption || "Barber work"}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                                <p className="text-white font-bold text-lg translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                    {img.caption || 'Royal Cut'}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </Section>
    );
};
