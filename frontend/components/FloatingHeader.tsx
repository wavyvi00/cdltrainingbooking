'use client';

import { useState, useEffect } from 'react';
import { UserMenu } from './UserMenu';

export function FloatingHeader() {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const handleScroll = () => {
            // Hide header immediately once user starts scrolling down (threshold 50px)
            setIsVisible(window.scrollY < 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 p-6 flex justify-end items-center pointer-events-none transition-opacity duration-500 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 translate-y-[-20px]'}`}
        >
            <div className="pointer-events-auto flex items-center gap-4">
                <UserMenu />
            </div>
        </header>
    );
}
