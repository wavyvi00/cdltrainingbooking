'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Environment, Stars, Sparkles } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

function AbstractBarberShapes() {
    const groupRef = useRef<THREE.Group>(null);
    const mainShapeRef = useRef<THREE.Mesh>(null);
    const secondaryShapeRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();

        if (groupRef.current) {
            // Gentle group rotation
            groupRef.current.rotation.y = time * 0.1;
        }

        // Pulse the main shape
        if (mainShapeRef.current) {
            const scale = 1 + Math.sin(time * 0.5) * 0.05;
            mainShapeRef.current.scale.set(scale, scale, scale);
        }
    });

    return (
        <group ref={groupRef}>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                {/* Main Abstract Shape - Metallic Knot (Representing complexity/art) */}
                <mesh ref={mainShapeRef} position={[0, 0, 0]}>
                    <torusKnotGeometry args={[1, 0.3, 128, 32]} />
                    <MeshDistortMaterial
                        color="#ffffff"
                        envMapIntensity={1}
                        clearcoat={1}
                        clearcoatRoughness={0.1}
                        metalness={0.9}
                        roughness={0.1}
                        distort={0.3}
                        speed={2}
                    />
                </mesh>

                {/* Secondary Shape - Sharp Ring (Representing precision) */}
                <mesh ref={secondaryShapeRef} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[2, 0.05, 16, 100]} />
                    <meshStandardMaterial
                        color="#6366f1" // Indigo accent
                        emissive="#4338ca"
                        emissiveIntensity={2}
                        toneMapped={false}
                    />
                </mesh>

                {/* Floating Particles */}
                <Sparkles count={50} scale={6} size={4} speed={0.4} opacity={0.5} color="#6366f1" />
            </Float>
        </group>
    );
}

export function LoginScene3D() {
    return (
        <div className="w-full h-full min-h-[500px] bg-zinc-950 relative overflow-hidden">

            <Canvas
                camera={{ position: [0, 0, 6], fov: 45 }}
                gl={{ antialias: true }}
                dpr={[1, 2]}
            >
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={2} color="#ffffff" />
                <pointLight position={[-5, -5, -5]} intensity={5} color="#6366f1" />

                <AbstractBarberShapes />

                {/* Environment for reflections without background */}
                <Environment preset="city" />

                {/* Background Atmosphere */}
                <fog attach="fog" args={['#09090b', 5, 20]} />
                <color attach="background" args={['#09090b']} />

                <Stars radius={50} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
            </Canvas>

            {/* Overlay Gradient for smooth blending if needed */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/50 pointer-events-none" />
        </div>
    );
}
