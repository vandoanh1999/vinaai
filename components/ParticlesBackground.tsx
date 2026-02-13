'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ParticlesBackgroundProps {
  particleCount?: number;
  particleSize?: number;
  connectionDistance?: number;
  mouseInteraction?: boolean;
}

export function ParticlesBackground({
  particleCount = 1500,
  particleSize = 2,
  connectionDistance = 150,
  mouseInteraction = true,
}: ParticlesBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const linesRef = useRef<THREE.LineSegments | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0e27, 0.001);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      2000
    );
    camera.position.z = 600;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0e27, 1);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Particles
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    // Color palette: cyan, blue, purple
    const colorPalette = [
      new THREE.Color(0x00ffff), // Cyan
      new THREE.Color(0x4169e1), // Royal Blue
      new THREE.Color(0x9370db), // Medium Purple
      new THREE.Color(0x1e90ff), // Dodger Blue
      new THREE.Color(0x8a2be2), // Blue Violet
    ];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Random position in 3D space
      positions[i3] = (Math.random() - 0.5) * 2000;
      positions[i3 + 1] = (Math.random() - 0.5) * 2000;
      positions[i3 + 2] = (Math.random() - 0.5) * 1000;

      // Random velocity
      velocities[i3] = (Math.random() - 0.5) * 0.5;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.5;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;

      // Random color from palette
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particlesGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: particleSize,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
    particlesRef.current = particles;

    // Lines for connections
    const linesGeometry = new THREE.BufferGeometry();
    const linesMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.3,
    });
    const lines = new THREE.LineSegments(linesGeometry, linesMaterial);
    scene.add(lines);
    linesRef.current = lines;

    // Mouse interaction
    const handleMouseMove = (event: MouseEvent) => {
      targetMouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      targetMouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    if (mouseInteraction) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth mouse movement
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.05;

      // Camera movement based on mouse
      if (mouseInteraction) {
        camera.position.x += (mouseRef.current.x * 100 - camera.position.x) * 0.02;
        camera.position.y += (mouseRef.current.y * 100 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);
      }

      // Update particles
      const positions = particlesGeometry.attributes.position.array as Float32Array;
      const colors = particlesGeometry.attributes.color.array as Float32Array;
      const velocities = particlesGeometry.attributes.velocity.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Update position with velocity
        positions[i3] += velocities[i3];
        positions[i3 + 1] += velocities[i3 + 1];
        positions[i3 + 2] += velocities[i3 + 2];

        // Boundary check - wrap around
        if (Math.abs(positions[i3]) > 1000) positions[i3] *= -1;
        if (Math.abs(positions[i3 + 1]) > 1000) positions[i3 + 1] *= -1;
        if (Math.abs(positions[i3 + 2]) > 500) positions[i3 + 2] *= -1;
      }

      // Update connections
      const linePositions: number[] = [];
      const lineColors: number[] = [];

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const x1 = positions[i3];
        const y1 = positions[i3 + 1];
        const z1 = positions[i3 + 2];

        // Check distance to nearby particles
        for (let j = i + 1; j < particleCount; j++) {
          const j3 = j * 3;
          const x2 = positions[j3];
          const y2 = positions[j3 + 1];
          const z2 = positions[j3 + 2];

          const dx = x1 - x2;
          const dy = y1 - y2;
          const dz = z1 - z2;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (distance < connectionDistance) {
            // Add line
            linePositions.push(x1, y1, z1, x2, y2, z2);

            // Color based on distance (closer = brighter)
            const alpha = 1 - distance / connectionDistance;
            const avgColor = {
              r: (colors[i3] + colors[j3]) / 2,
              g: (colors[i3 + 1] + colors[j3 + 1]) / 2,
              b: (colors[i3 + 2] + colors[j3 + 2]) / 2,
            };

            // Collision detection - change color on close proximity
            if (distance < connectionDistance * 0.3) {
              // Change to bright cyan on collision
              colors[i3] = 0;
              colors[i3 + 1] = 1;
              colors[i3 + 2] = 1;
            }

            lineColors.push(
              avgColor.r * alpha,
              avgColor.g * alpha,
              avgColor.b * alpha,
              avgColor.r * alpha,
              avgColor.g * alpha,
              avgColor.b * alpha
            );
          }
        }
      }

      linesGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(linePositions, 3)
      );
      linesGeometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(lineColors, 3)
      );

      particlesGeometry.attributes.position.needsUpdate = true;
      particlesGeometry.attributes.color.needsUpdate = true;

      // Rotate particles slightly for depth effect
      particles.rotation.y += 0.0002;
      particles.rotation.x += 0.0001;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (mouseInteraction) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      renderer.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      linesGeometry.dispose();
      linesMaterial.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [particleCount, particleSize, connectionDistance, mouseInteraction]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10"
      style={{
        background: 'linear-gradient(180deg, #0a0e27 0%, #1a1f3a 100%)',
      }}
    />
  );
}