'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface ParticleSwirlProps {
    count?: number;
    color: string;
    radius?: number;
    spinSpeed?: number;
    offset?: number;
    phase?: number;
}

function ParticleSwirl({ count = 2000, color, radius = 5, spinSpeed = 0.1, offset = 0, phase = 0 }: ParticleSwirlProps) {
    const pointsRef = useRef<THREE.Points>(null);

    // Generate positions for a spiral/yin-yang arm
    const positions = useMemo(() => {
        const temp = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            // Distribution: More dense at center
            const t = Math.random();
            const dist = Math.pow(t, 2) * radius; // Exponential distribution for core density

            // Spiral Angle: Increases with distance
            const spin = dist * 2 + phase; // phase offsets the entire arm
            const angle = (Math.random() * Math.PI * 0.5) + spin; // spread

            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist * 0.3; // Flattened slightly? Or Z? Let's keep it flat on Y for now, or tilt logic later.
            // Let's do X-Y plane for now, and rotate the whole thing.

            // 3D Thickness
            const z = (Math.random() - 0.5) * (dist * 0.5); // Thicker at edges

            temp[i * 3] = Math.cos(angle) * dist;
            temp[i * 3 + 1] = (Math.random() - 0.5) * (dist * 0.2); // Y is "height" here
            temp[i * 3 + 2] = Math.sin(angle) * dist;
        }
        return temp;
    }, [count, radius, phase]);

    useFrame((state, delta) => {
        if (pointsRef.current) {
            // Constant rotation
            pointsRef.current.rotation.y += delta * spinSpeed;
        }
    });

    return (
        <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
            <PointMaterial
                transparent
                color={color}
                size={0.025}
                sizeAttenuation={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                opacity={0.8}
            />
        </Points>
    );
}

function Scene() {
    return (
        <group rotation={[0, 0, Math.PI / 6]}> {/* Tilt the whole galaxy */}
            {/* Arm 1: White/Cyan - "Yang" */}
            <ParticleSwirl count={2500} color="#cbd5e1" radius={8} spinSpeed={0.05} phase={0} />

            {/* Arm 2: Indigo/Purple - "Yin" */}
            <ParticleSwirl count={2500} color="#6366f1" radius={8} spinSpeed={0.05} phase={Math.PI} />

            {/* Ambient "Dust" */}
            <ParticleSwirl count={1000} color="#4f46e5" radius={12} spinSpeed={0.02} phase={Math.PI * 0.5} />
        </group>
    );
}

export default function YinYangBackground() {
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduceMotion(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    // Static fallback or no animation if reduced motion (though current implementation just stops updating if we logic it, 
    // but the component above will rotate regardless. For strict reduced motion we might want to pass prop or just return null for heavy GPU stuff).
    // The prompt says "optional for reduced-motion users". I'll allow it to render stationary if reduced motion? 
    // Or simpler: just render it, it's slow/ambient. 
    // If strict reduced motion, maybe just opacity 0.

    if (reduceMotion) return null;

    return (
        <div className="absolute inset-0 z-0">
            <Canvas
                camera={{ position: [0, 5, 10], fov: 45 }}
                gl={{ antialias: false, alpha: true }} // Perf optimizations
                dpr={[1, 1.5]} // Limit pixel ratio for perf
            >
                <Scene />
            </Canvas>
        </div>
    );
}
