'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface GlowCardProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

export const GlowCard: React.FC<GlowCardProps> = ({ children, className = '', delay = 0 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay, ease: "easeOut" }}
            viewport={{ once: true, margin: "-50px" }}
            className={`group relative p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all duration-500 ${className}`}
        >
            {/* Hover Glow Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent pointer-events-none" />

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
};
