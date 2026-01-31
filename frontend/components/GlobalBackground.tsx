import { LandingPageBackground } from '@/components/landing/LandingPageBackground';

export const GlobalBackground = () => {
    return (
        <div className="fixed inset-0 pointer-events-none z-0">
            {/* Base Dark Background */}
            <div className="absolute inset-0 bg-[#050505]" />

            {/* Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] opacity-80" />

            {/* Color Glows */}
            <div className="absolute top-0 left-0 right-0 h-[500px] bg-indigo-900/10 blur-[100px]" />
            <div className="absolute bottom-0 left-0 right-0 h-[500px] bg-purple-900/5 blur-[100px]" />

            {/* 3D Particle Background */}
            <LandingPageBackground />
        </div>
    );
}
