'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Gallery() {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchImages = async () => {
            const res = await fetch('/api/gallery');
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.images?.length > 0) {
                setImages(data.images);
            }
            setLoading(false);
        };

        fetchImages();
    }, []);

    // If no images and not loading, don't render section (or render placeholder?)
    // Decision: Render nothing if empty to avoid broken UI.
    if (!loading && images.length === 0) return null;

    return (
        <section className="py-24 bg-black/10 backdrop-blur-sm relative overflow-hidden">
            {/* Background Texture - optional, keep it subtle */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4"
                    >
                        THE CRAFT
                    </motion.h2>
                    <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        whileInView={{ opacity: 1, width: '100px' }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        viewport={{ once: true }}
                        className="h-1 bg-indigo-500 mx-auto rounded-full"
                    />
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="aspect-[4/5] bg-white/5 rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Simple Masonry-like mapping or just direct mapping.
                             For strict masonry we need columns. For simplicity, just grid.
                             Let's do a cool bento-style grid if possible, or just standard grid.
                         */}
                        {images.map((img, i) => (
                            <motion.div
                                key={img.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                viewport={{ once: true }}
                                className="group relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 aspect-[4/5] md:aspect-auto md:h-[400px]"
                            >
                                <img
                                    src={img.image_url}
                                    alt="Barber Work"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                                    <p className="text-white font-medium tracking-wide text-sm">{img.caption || 'Royal Cut'}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
