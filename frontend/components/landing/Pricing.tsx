'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Section } from './shared/Section';
import { Badge } from './shared/Badge';
import { supabase } from '@/lib/supabaseClient';

export const Pricing: React.FC = () => {
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchServices = async () => {
            const { data } = await (supabase.from('services') as any)
                .select('*')
                .eq('active', true)
                .order('price_cents', { ascending: true })
                .limit(3); // Grab top 3

            if (data) {
                setServices(data);
            }
            setLoading(false);
        };

        fetchServices();
    }, []);

    const getFeatures = (service: any) => {
        // Generate features based on price/name if backend doesn't have them
        const price = service.price_cents / 100;
        const features = ["Precision Haircut", "Product Styling"];

        if (price >= 40) features.push("Razor Lineup", "Hot Towel Finish");
        if (price >= 60) features.push("Beard Sculpting", "Eyebrow Shape");
        if (price >= 80) {
            features.push("Black Mask Facial", "Premium Hair Wash", "VIP Beverages");
        }

        return features.slice(0, 5); // Max 5 items
    };

    if (loading) return null; // Or a skeleton, but keeping it clean for now

    return (
        <Section className="bg-transparent" id="services">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                    SERVICE <span className="text-zinc-600">MENU</span>
                </h2>
                <p className="text-zinc-400">Simple, transparent pricing. No hidden fees.</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
                {services.map((service, index) => {
                    // Simple logic for highlighting the "middle" or highest priced option as popular
                    const isPopular = index === 1 || service.price_cents > 6000;

                    return (
                        <div
                            key={service.id}
                            className={`relative p-8 rounded-3xl border transition-all duration-300 ${isPopular ? 'bg-zinc-900/80 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.15)] scale-105 z-10' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                        >
                            {isPopular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <Badge variant="brand">Most Popular</Badge>
                                </div>
                            )}

                            <div className="text-center mb-8">
                                <h3 className="text-xl font-bold text-white mb-2">{service.name}</h3>
                                <div className="flex items-baseline justify-center gap-1 mb-2">
                                    <span className="text-4xl font-black text-white">${(service.price_cents / 100).toFixed(0)}</span>
                                </div>
                                <span className="text-sm text-zinc-500 font-mono">{service.duration_min} Min</span>
                            </div>

                            <ul className="space-y-4 mb-8 min-h-[160px]">
                                {getFeatures(service).map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                                        <span className={`text-lg ${isPopular ? 'text-indigo-400' : 'text-zinc-600'}`}>
                                            {/* @ts-ignore */}
                                            <iconify-icon icon="ph:check-light"></iconify-icon>
                                        </span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={`/book?service=${service.id}`}
                                className={`block w-full py-4 rounded-xl text-sm font-bold uppercase tracking-widest text-center transition-colors ${isPopular ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                            >
                                Book now
                            </Link>
                        </div>
                    );
                })}
            </div>
        </Section>
    );
};
