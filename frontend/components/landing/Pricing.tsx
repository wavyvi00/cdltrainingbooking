'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Section } from './shared/Section';
import { Badge } from './shared/Badge';
import { supabase } from '@/lib/supabaseClient';
import { Truck, BookOpen, RotateCcw, Check, Users, Clock } from 'lucide-react';

const moduleIcons: Record<string, any> = {
    road: Truck,
    backing: RotateCcw,
    pretrip: BookOpen,
};

const moduleColors: Record<string, string> = {
    road: 'from-blue-500 to-blue-600',
    backing: 'from-amber-500 to-orange-500',
    pretrip: 'from-emerald-500 to-green-500',
};

const moduleDescriptions: Record<string, string[]> = {
    road: [
        'Private 1-on-1 instruction',
        'Real road driving experience',
        'Highway & city navigation',
        'Safety procedures',
        'Test route preparation'
    ],
    backing: [
        '2-student paired sessions',
        'Straight-line backing',
        'Offset backing',
        'Parallel parking (90°)',
        'Alley dock maneuvers'
    ],
    pretrip: [
        'Group classroom setting',
        'Complete vehicle inspection',
        'Engine compartment check',
        'In-cab inspection',
        'Walk-around procedures'
    ],
};

export const Pricing: React.FC = () => {
    const [modules, setModules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchModules = async () => {
            const { data } = await (supabase.from('training_modules') as any)
                .select('*')
                .eq('active', true)
                .order('display_order', { ascending: true });

            if (data) {
                setModules(data);
            }
            setLoading(false);
        };

        fetchModules();
    }, []);

    if (loading) return null;

    // Fallback if no modules from DB
    const displayModules = modules.length > 0 ? modules : [
        { id: '1', name: 'Road Training', module_type: 'road', price_cents: 7000, duration_min: 60, capacity: 1 },
        { id: '2', name: 'Backing Practice', module_type: 'backing', price_cents: 6000, duration_min: 60, capacity: 2 },
        { id: '3', name: 'Pre-Trip Inspection', module_type: 'pretrip', price_cents: 3000, duration_min: 60, capacity: 8 },
    ];

    return (
        <Section className="bg-transparent" id="modules">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                    TRAINING <span className="text-zinc-600">MODULES</span>
                </h2>
                <p className="text-zinc-400">Choose the training you need. Book by the session.</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
                {displayModules.map((module, index) => {
                    const Icon = moduleIcons[module.module_type] || Truck;
                    const gradient = moduleColors[module.module_type] || 'from-blue-500 to-blue-600';
                    const features = moduleDescriptions[module.module_type] || [];
                    const isPopular = module.module_type === 'road';

                    return (
                        <div
                            key={module.id}
                            className={`relative p-8 rounded-3xl border transition-all duration-300 flex flex-col ${isPopular
                                    ? 'bg-zinc-900/80 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)] scale-105 z-10'
                                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                }`}
                        >
                            {isPopular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <Badge variant="brand">Most Popular</Badge>
                                </div>
                            )}

                            {/* Header */}
                            <div className="text-center mb-6">
                                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                                    <Icon className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{module.name}</h3>
                                <div className="flex items-baseline justify-center gap-1 mb-2">
                                    <span className="text-4xl font-black text-white">
                                        ${(module.price_cents / 100).toFixed(0)}
                                    </span>
                                    <span className="text-zinc-500">/session</span>
                                </div>
                                <div className="flex items-center justify-center gap-4 text-sm text-zinc-500">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {module.duration_min} min
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {module.capacity === 1 ? 'Private' :
                                            module.capacity === 2 ? 'Paired' :
                                                `Up to ${module.capacity}`}
                                    </span>
                                </div>
                            </div>

                            {/* Features */}
                            <ul className="space-y-3 mb-8 flex-1">
                                {features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                                        <Check className={`w-4 h-4 shrink-0 ${isPopular ? 'text-blue-400' : 'text-zinc-600'}`} />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <Link
                                href={`/training/book?module=${module.id}`}
                                className={`block w-full py-4 rounded-xl text-sm font-bold uppercase tracking-widest text-center transition-colors ${isPopular
                                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                        : 'bg-white/5 hover:bg-white/10 text-white'
                                    }`}
                            >
                                Book Now
                            </Link>
                        </div>
                    );
                })}
            </div>

            {/* Additional Info */}
            <div className="mt-12 text-center">
                <p className="text-zinc-500 text-sm max-w-xl mx-auto">
                    All training sessions are held on weekends. You must be enrolled in our CDL program to book sessions.
                    <Link href="/enroll" className="text-blue-400 hover:underline ml-1">
                        Learn about enrollment →
                    </Link>
                </p>
            </div>
        </Section>
    );
};
