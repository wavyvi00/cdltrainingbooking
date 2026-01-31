'use client';

import React from 'react';
import { Section } from './shared/Section';
import { GlowCard } from './shared/GlowCard';

export const Features: React.FC = () => {
    const features = [
        {
            icon: "ph:chair-light",
            title: "Private Studio",
            description: "A one-on-one environment where your comfort and privacy are the priority."
        },
        {
            icon: "ph:scissors-light",
            title: "Precision Tools",
            description: "Using only the highest quality clippers, shears, and razors for a perfect finish."
        },
        {
            icon: "ph:calendar-check-light",
            title: "Appointment Only",
            description: "No waiting lines. Your time is respected with a strictly managed schedule."
        },
        {
            icon: "ph:user-focus-light",
            title: "Style Consultation",
            description: "Personalized assessment of your head shape and hair texture before every cut."
        },
        {
            icon: "ph:spray-bottle-light",
            title: "Hygiene Standard",
            description: "Hospital-grade sanitation protocols for tools and station between every client."
        },
        {
            icon: "ph:clock-user-light",
            title: "Consistent Timing",
            description: "Reliable appointment starts that run on schedule, respecting your time."
        }
    ];

    return (
        <Section className="bg-transparent">
            <div className="text-center mb-16 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                    THE <span className="text-zinc-600">EXPERIENCE</span>
                </h2>
                <p className="text-zinc-400">
                    More than just a haircut. A dedicated grooming ritual designed for the modern gentleman.
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, index) => (
                    <GlowCard key={index} delay={index * 0.1} className="h-full">
                        <div className="mb-4 text-indigo-400/80">
                            {/* @ts-ignore */}
                            <iconify-icon icon={feature.icon} width="32"></iconify-icon>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            {feature.description}
                        </p>
                    </GlowCard>
                ))}
            </div>
        </Section>
    );
};
