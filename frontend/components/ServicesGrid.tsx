'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

import { motion } from 'framer-motion';
import { Scissors, Zap, Clock, Star } from 'lucide-react';
import { clsx } from 'clsx';

const FEATURES = [
    {
        icon: Scissors,
        title: 'Precision Cuts',
        description: 'Tailored specifically to your head shape and style preference.',
        price: 'From $45'
    },
    {
        icon: Zap,
        title: 'Hot Towel Shave',
        description: 'Classic straight razor chaves with essential oils and hot towels.',
        price: 'From $35'
    },
    {
        icon: Clock,
        title: 'Express Service',
        description: 'In a rush? Get a cleanup and styling in under 30 minutes.',
        price: '$30'
    },
    {
        icon: Star,
        title: 'VIP Package',
        description: 'The full works: Cut, Wash, Beard Sculpt, and Facial.',
        price: '$90'
    }
];

export function ServicesGrid() {
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchServices = async () => {
            const { data } = await (supabase.from('services') as any)
                .select('*')
                .eq('active', true)
                .order('price_cents', { ascending: true })
                .limit(4); // Limit to top 4 for the grid

            if (data) {
                setServices(data);
            }
            setLoading(false);
        };
        fetchServices();
    }, []);

    // Helper to get icon (cycle through)
    const getIcon = (index: number) => {
        const icons = [Scissors, Zap, Clock, Star];
        return icons[index % icons.length];
    };

    if (loading) return null; // Or a skeleton

    return (
        <section className="py-24 bg-black/20 backdrop-blur-md">
            <div className="container mx-auto px-6">
                <div className="mb-16 text-center">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                        The Private Studio
                    </h2>
                    <p className="text-zinc-400 max-w-2xl mx-auto">
                        A fully equipped executive cabin designed for your comfort/privacy.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {services.map((service, i) => {
                        const Icon = getIcon(i);
                        return (
                            <motion.div
                                key={service.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -10, scale: 1.02 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1, duration: 0.4, ease: "backOut" }}
                                className={clsx(
                                    "group p-8 rounded-2xl border transition-all duration-300 relative overflow-hidden",
                                    service.name.includes('VIP') || service.price_cents > 8000
                                        ? "bg-zinc-900/80 border-indigo-500/30 hover:border-indigo-500 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]"
                                        : "bg-zinc-900/50 border-zinc-800 hover:border-white/20 hover:bg-zinc-900 hover:shadow-2xl"
                                )}
                            >
                                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <div className="mb-6 inline-flex p-3 rounded-lg bg-white/5 text-white mb-6 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300 relative z-10">
                                    <Icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 relative z-10">{service.name}</h3>
                                <p className="text-zinc-400 text-sm leading-relaxed mb-4 relative z-10">
                                    {service.description || 'No description available.'}
                                </p>
                                <div className="text-white font-mono text-sm opacity-60 group-hover:opacity-100 transition-opacity relative z-10 font-bold tracking-wider">
                                    ${(service.price_cents / 100).toFixed(0)}
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </section>
    );
}
