'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Text, ContactShadows, Environment, MeshTransmissionMaterial } from '@react-three/drei';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

function DataBar({ position, height, color, label }: { position: [number, number, number], height: number, color: string, label: string }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const targetHeight = useRef(height);

    useFrame((state, delta) => {
        if (meshRef.current) {
            // Animate height
            meshRef.current.scale.y = THREE.MathUtils.damp(meshRef.current.scale.y, targetHeight.current, 4, delta);
            // Gentle hover
            meshRef.current.position.y = position[1] + (meshRef.current.scale.y / 2) + Math.sin(state.clock.elapsedTime + position[0]) * 0.05;
        }
    });

    return (
        <group position={[position[0], 0, position[2]]}>
            <mesh ref={meshRef} scale={[1, 0.1, 1]}> {/* Start small */}
                <boxGeometry args={[0.8, 1, 0.8]} />
                <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
            </mesh>
            <Text
                position={[0, -0.5, 0.5]}
                fontSize={0.2}
                color="white"
                anchorX="center"
                anchorY="middle"
            >
                {label}
            </Text>
        </group>
    );
}

function StatsScene({ metrics }: { metrics: any }) {
    // Normalize metrics for visualization height (max height ~3)
    const maxVal = Math.max(metrics.revenueMonth || 1, 5000); // Assume 5k max for scale
    const revHeight = (metrics.revenueMonth / maxVal) * 3 + 0.5;
    const apptHeight = Math.min((metrics.appointmentsWeek || 0) * 0.3 + 0.5, 3);
    const pendingHeight = Math.min((metrics.pendingRequests || 0) * 0.5 + 0.5, 3);
    const clientHeight = Math.min((metrics.totalClients || 0) * 0.1 + 0.5, 3);

    return (
        <group position={[0, -1, 0]}>
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
                <DataBar position={[-2.5, 0, 0]} height={revHeight} color="#4ade80" label="REV" />
                <DataBar position={[-0.8, 0, 0]} height={apptHeight} color="#60a5fa" label="APPT" />
                <DataBar position={[0.8, 0, 0]} height={pendingHeight} color="#fb923c" label="PEND" />
                <DataBar position={[2.5, 0, 0]} height={clientHeight} color="#c084fc" label="CLIENT" />
            </Float>
            <ContactShadows opacity={0.4} scale={10} blur={2.5} far={4} />
        </group>
    );
}

export function DashboardStats3D({ metrics }: { metrics: any }) {
    return (
        <div className="w-full h-[300px] bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden relative">
            <div className="absolute top-4 left-6 z-10 pointer-events-none">
                <h3 className="text-lg font-bold text-white">Live Metrics</h3>
                <p className="text-zinc-500 text-xs">Real-time 3D visualization</p>
            </div>

            <Canvas camera={{ position: [0, 1, 6], fov: 40 }} dpr={[1, 2]}>
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={5} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={5} color="#6366f1" />

                <StatsScene metrics={metrics} />

                <Environment preset="night" />
            </Canvas>
        </div>
    );
}
