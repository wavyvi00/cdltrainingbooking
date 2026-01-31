import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'brand' | 'outline' | 'neutral';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
    const baseStyles = "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border backdrop-blur-md";

    const variants = {
        brand: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]",
        outline: "bg-transparent border-white/20 text-zinc-300",
        neutral: "bg-white/5 border-white/10 text-zinc-400"
    };

    return (
        <div className={`${baseStyles} ${variants[variant]} ${className}`}>
            {children}
        </div>
    );
};
