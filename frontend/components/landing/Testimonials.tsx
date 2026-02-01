'use client';

import React from 'react';
import { Section } from './shared/Section';
import { GlowCard } from './shared/GlowCard';
import { Star } from 'lucide-react';

export const Testimonials: React.FC = () => {
    const reviews = [
        {
            name: "Marcus T.",
            role: "Now a Local Driver",
            quote: "The instructors here are amazing. I passed my CDL test on the first try thanks to the thorough training, especially on backing maneuvers.",
            rating: 5
        },
        {
            name: "Jennifer K.",
            role: "OTR Driver",
            quote: "Weekend scheduling was perfect for me since I was working full-time. The pre-trip inspection training was exactly what I needed to feel confident on test day.",
            rating: 5
        },
        {
            name: "David R.",
            role: "Delivery Driver",
            quote: "Best CDL training in Florida. Small class sizes meant I got plenty of behind-the-wheel time. Worth every penny.",
            rating: 5
        }
    ];

    return (
        <Section className="bg-transparent" id="reviews">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                    STUDENT <span className="text-zinc-600">SUCCESS</span>
                </h2>
                <p className="text-zinc-400">Hear from drivers who earned their CDL with us.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {reviews.map((review, index) => (
                    <GlowCard key={index} delay={index * 0.1}>
                        <div className="flex gap-1 text-amber-400 mb-4">
                            {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-current" />
                            ))}
                        </div>
                        <p className="text-zinc-300 italic mb-6 leading-relaxed">"{review.quote}"</p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
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
