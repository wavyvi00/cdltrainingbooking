'use client';

import React from 'react';
import { Section } from './shared/Section';
import { GlowCard } from './shared/GlowCard';
import { Truck, Users, Calendar, Shield, Award, Clock } from 'lucide-react';

export const Features: React.FC = () => {
    const features = [
        {
            icon: Truck,
            title: "Behind-the-Wheel Training",
            description: "Real road experience with modern commercial vehicles. Practice driving, backing, and maneuvering.",
            color: "text-blue-400"
        },
        {
            icon: Users,
            title: "Expert Instructors",
            description: "Learn from licensed CDL instructors with years of industry and teaching experience.",
            color: "text-emerald-400"
        },
        {
            icon: Calendar,
            title: "Weekend Scheduling",
            description: "Flexible Saturday and Sunday sessions that fit around your work schedule.",
            color: "text-amber-400"
        },
        {
            icon: Shield,
            title: "Pre-Trip Mastery",
            description: "Comprehensive inspection training to ace the pre-trip portion of your CDL exam.",
            color: "text-purple-400"
        },
        {
            icon: Award,
            title: "High Pass Rates",
            description: "95% of our students pass their CDL exam on the first attempt.",
            color: "text-rose-400"
        },
        {
            icon: Clock,
            title: "Flexible Hours",
            description: "Book the training hours you need. Pay per session with no long-term contracts.",
            color: "text-cyan-400"
        }
    ];

    return (
        <Section className="bg-transparent" id="why-us">
            <div className="text-center mb-16 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                    WHY <span className="text-zinc-600">TRAIN WITH US</span>
                </h2>
                <p className="text-zinc-400">
                    Professional CDL training designed to get you licensed and on the road safely.
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                        <GlowCard key={index} delay={index * 0.1} className="h-full">
                            <div className={`mb-4 ${feature.color}`}>
                                <Icon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                {feature.description}
                            </p>
                        </GlowCard>
                    );
                })}
            </div>
        </Section>
    );
};
