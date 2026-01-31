import React from 'react';

interface SectionProps {
    children: React.ReactNode;
    className?: string;
    id?: string;
}

export const Section: React.FC<SectionProps> = ({ children, className = '', id }) => {
    return (
        <section id={id} className={`relative py-20 md:py-32 px-6 overflow-hidden ${className}`}>
            {/* Max width container */}
            <div className="container mx-auto relative z-10 max-w-7xl">
                {children}
            </div>
        </section>
    );
};
