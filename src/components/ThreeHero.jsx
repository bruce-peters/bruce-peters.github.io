import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Strange irregular shape made of white dots outlining its form
const StrangeShape = () => {
  const particlesRef = useRef();

  const positions = useMemo(() => {
    const points = [];

    // Create a 3D surface with randomly distributed dots for no visible lines
    const numPoints = 3000;

    for (let i = 0; i < numPoints; i++) {
      // Use random sampling on sphere surface with oblong distortion
      // Fibonacci sphere distribution for even coverage
      const phi = Math.acos(1 - (2 * (i + 0.5)) / numPoints);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      // Add randomness to break up any patterns
      const randomOffset = 0.15;
      const phiRandom = phi + (Math.random() - 0.5) * randomOffset;
      const thetaRandom = theta + (Math.random() - 0.5) * randomOffset;

      // Create oblong shape with subtle irregularity
      const oblongStretch = 2.2;
      const noise1 = Math.sin(thetaRandom * 2) * Math.cos(phiRandom * 2) * 0.3;
      const noise2 = Math.sin(thetaRandom * 4) * Math.sin(phiRandom * 3) * 0.25;
      const noise3 = Math.cos(thetaRandom * 6 + phiRandom * 5) * 0.2;

      const baseRadius = 1.4 + noise1 + noise2 + noise3;

      // Spherical coordinates with oblong distortion (vertical stretch)
      const sinPhi = Math.sin(phiRandom);
      const x = baseRadius * sinPhi * Math.cos(thetaRandom);
      const y = baseRadius * sinPhi * Math.sin(thetaRandom);
      const z = baseRadius * Math.cos(phiRandom) * oblongStretch;

      // More pronounced waviness for stranger look
      const wave = Math.sin(thetaRandom * 3 + phiRandom * 2) * 0.18;

      points.push(x + wave, y + wave * 0.5, z + wave * 0.5);
    }

    return new Float32Array(points);
  }, []);

  useFrame(({ clock }) => {
    if (particlesRef.current) {
      const t = clock.getElapsedTime();

      // Slow rotation to show the 3D nature of the strange shape
      particlesRef.current.rotation.x = Math.sin(t * 0.1) * 0.3;
      particlesRef.current.rotation.y = t * 0.15;
      particlesRef.current.rotation.z = Math.cos(t * 0.08) * 0.2;

      // Subtle floating motion
      particlesRef.current.position.y = Math.sin(t * 0.3) * 0.1;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#ffffff"
        transparent
        opacity={0.9}
        sizeAttenuation
      />
    </points>
  );
};

const ThreeHero = () => {
  return (
    <div className="absolute right-0 top-0 w-1/2 h-full pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        style={{ background: "transparent" }}
      >
        {/* Minimal lighting to keep it mysterious */}
        <ambientLight intensity={0.3} />

        {/* The strange irregular shape made of dots */}
        <StrangeShape />
      </Canvas>
    </div>
  );
};

export default ThreeHero;
