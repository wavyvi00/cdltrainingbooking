'use client';

import dynamic from 'next/dynamic';

const YinYangBackground = dynamic(() => import('./YinYangBackground'), {
    ssr: false,
    loading: () => null
});

export const LandingPageBackground = () => {
    return <YinYangBackground />;
};
