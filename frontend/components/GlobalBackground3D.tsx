// @ts-nocheck
'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles, Stars } from '@react-three/drei';
import * as THREE from 'three';

function YinYangScene() {
    // Two spheres: Yang (White) and Yin (Black)
    const yangRef = useRef<THREE.Mesh>(null); // White
    const yinRef = useRef<THREE.Mesh>(null); // Black
    const groupRef = useRef<THREE.Group>(null);

    // Mouse tracking for parallax
    const mouse = useRef({ x: 0, y: 0 });

    useFrame((state) => {
        // 1. SCROLL PROGRESS
        const scrollY = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.max(0, Math.min(1, scrollY / (maxScroll || 1))); // 0 to 1

        const time = state.clock.getElapsedTime();

        // 2. MOUSE PARALLAX
        const targetMouseX = (state.pointer.x * 1.5);
        const targetMouseY = (state.pointer.y * 1.5);

        mouse.current.x = THREE.MathUtils.damp(mouse.current.x, targetMouseX, 2, state.clock.getDelta());
        mouse.current.y = THREE.MathUtils.damp(mouse.current.y, targetMouseY, 2, state.clock.getDelta());

        // ORBITAL LOGIC
        // Base orbit speed
        const orbitSpeed = time * 0.25;
        const radius = 1.7 + (Math.sin(time * 0.5) * 0.2);

        // YANG (White - Milk/Water)
        if (yangRef.current) {
            const material = yangRef.current.material as any;

            // Fluid Motion
            material.distort = 0.4 + (progress * 0.5);
            material.speed = 3 + (progress * 3);

            // Orbit Position
            yangRef.current.position.x = Math.cos(orbitSpeed) * radius;
            yangRef.current.position.z = Math.sin(orbitSpeed) * radius * 0.5;
            yangRef.current.position.y = Math.sin(time * 0.8) * 0.5;

            // Rotation
            yangRef.current.rotation.x = time * 0.2;
            yangRef.current.rotation.y = time * 0.4;

            // Ensure Pure White
            if (material.color) material.color.set('#ffffff');
        }

        // YIN (Black - Oil/Obsidian)
        if (yinRef.current) {
            const material = yinRef.current.material as any;

            // Fluid Motion
            material.distort = 0.5 + (progress * 0.6);
            material.speed = 4 + (progress * 2);

            // Orbit Position (Opposite side)
            yinRef.current.position.x = Math.cos(orbitSpeed + Math.PI) * radius;
            yinRef.current.position.z = Math.sin(orbitSpeed + Math.PI) * radius * 0.5;
            yinRef.current.position.y = Math.sin(time * 0.8 + Math.PI) * 0.5;

            // Rotation
            yinRef.current.rotation.x = time * 0.15;
            yinRef.current.rotation.y = time * 0.35;
        }

        // SCROLL & MOUSE GROUP MOVEMENT
        if (groupRef.current) {
            // Unchanged move logic...
            let targetX = 0;
            let targetY = -progress * 2;
            let targetZ = 0;

            if (progress < 0.2) {
                targetX = 0;
            } else if (progress < 0.5) {
                targetX = 2;
                targetZ = -1;
            } else if (progress < 0.8) {
                targetX = -2;
                targetZ = 0;
            } else {
                targetX = 0;
                targetZ = -4;
            }

            targetX += mouse.current.x * 0.5;
            targetY += mouse.current.y * 0.5;

            const twist = progress * Math.PI * 0.5;

            groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetX, 2, state.clock.getDelta());
            groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY, 2, state.clock.getDelta());
            groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetZ, 2, state.clock.getDelta());

            // Rotate group to show different angles of the orbit
            groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, twist, 2, state.clock.getDelta());
        }
    });

    return (
        <group ref={groupRef}>
            <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>

                {/* YANG: White Liquid (Ceramic/Milk Look) */}
                <mesh ref={yangRef} scale={1.4}>
                    <sphereGeometry args={[1, 128, 128]} />
                    <MeshDistortMaterial
                        color="#ffffff"
                        attach="material"
                        distort={0.4}
                        speed={3}
                        roughness={0.2}
                        metalness={0.1}
                        clearcoat={1}
                        clearcoatRoughness={0.2}
                        radius={1}
                    />
                </mesh>

                {/* YIN: Black Liquid (Oil Look) */}
                <mesh ref={yinRef} scale={1.2}>
                    <sphereGeometry args={[1, 128, 128]} />
                    <MeshDistortMaterial
                        color="#050505"
                        attach="material"
                        distort={0.5}
                        speed={4}
                        roughness={0.2} // Matching White
                        metalness={0.1} // Matching White
                        clearcoat={1}
                        clearcoatRoughness={0.2}
                        radius={1}
                    />
                </mesh>

            </Float>

            {/* Ambient Particles - Floating Dust */}
            <Sparkles count={150} scale={12} size={2} speed={0.4} opacity={0.4} color="#ffffff" />
        </group>
    );
}

export function GlobalBackground3D() {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none bg-zinc-950">
            <Canvas
                shadows
                dpr={[1, 1.5]}
                camera={{ position: [0, 0, 7], fov: 35 }}
                gl={{ antialias: true, alpha: false }}
            >
                {/* 
                   PURE MATH LIGHTING ONLY. 
                   No Environment map means no "Image" to reflect.
                */}
                <ambientLight intensity={0.8} />
                <directionalLight position={[10, 10, 5]} intensity={3} color="#ffffff" />
                <directionalLight position={[-5, 5, -5]} intensity={5} color="#6366f1" />

                {/* NOTE: Environment component is intentionally OMITTED to prevent image reflections. */}

                <YinYangScene />

                {/* SPACE ATMOSPHERE */}
                {/* 1. Deep Background Color */}
                <color attach="background" args={['#020202']} />

                {/* 2. Fog for Depth cue */}
                <fog attach="fog" args={['#020202', 8, 30]} />

                {/* 3. Infinite Stars */}
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            </Canvas>
        </div>
    );
}
