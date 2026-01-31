'use client';

import React from 'react';
import { Section } from './shared/Section';
import { GlowCard } from './shared/GlowCard';

export const Testimonials: React.FC = () => {
    const reviews = [
        {
            name: "Michael R.",
            role: "Software Architect",
            quote: "Best haircut I've had in years. The attention to detail is unmatched, and the private studio vibe is exactly what I needed.",
            rating: 5
        },
        {
            name: "David K.",
            role: "Entrepreneur",
            quote: "Roy cuts with a precision that is rare to find. Always on time, professional, and the consistent quality keeps me coming back.",
            rating: 5
        },
        {
            name: "James L.",
            role: "Creative Director",
            quote: "The studio atmosphere is top tier. Clean, modern, and relaxing. I walk out feeling brand new every single time.",
            rating: 5
        }
    ];

    return (
        <Section className="bg-transparent">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                    CLIENT <span className="text-zinc-600">STORIES</span>
                </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {reviews.map((review, index) => (
                    <GlowCard key={index} delay={index * 0.1}>
                        <div className="flex gap-1 text-indigo-400 mb-4">
                            {[...Array(review.rating)].map((_, i) => (
                                // @ts-ignore
                                <iconify-icon key={i} icon="ph:star-fill" width="16"></iconify-icon>
                            ))}
                        </div>
                        <p className="text-zinc-300 italic mb-6 leading-relaxed">"{review.quote}"</p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-500 font-bold">
                                {review.name.charAt(0)}
                            </div>
                            <div>
                                <div className="text-white font-bold text-sm">{review.name}</div>
                                <div className="text-zinc-600 text-xs uppercase tracking-wider">{review.role}</div>
                            </div>
                        </div>
                    </GlowCard>
                ))}
            </div>
        </Section>
    );
};
