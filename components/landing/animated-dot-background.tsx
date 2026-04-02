'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

export function AnimatedDotBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only running after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    let particles: Particle[] = [];
    let animationFrameId: number;

    const MOUSE_RADIUS = 200; // repel radius increased slightly
    const DOT_SPACING = 35;   // density
    const DOT_RADIUS = resolvedTheme === 'light' ? 2.5 : 1.5;   // slightly larger in light mode so colors pop

    // Light mode colorful palette
    const lightPalette = ['#00e5ff', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

    // Mouse state wrapper
    const mouse = {
      x: -1000,
      y: -1000,
      isActive: false,
    };

    class Particle {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      density: number;
      color: string;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.density = (Math.random() * 25) + 5;
        
        // Randomly pick color if light mode, else use glowing cyan
        if (resolvedTheme === 'light') {
          this.color = lightPalette[Math.floor(Math.random() * lightPalette.length)];
        } else {
          this.color = 'rgba(0, 229, 255, 0.4)';
        }
      }

      draw() {
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, DOT_RADIUS, 0, Math.PI * 2);
        
        // In light mode we make it solid to survive multiply, in dark mode it remains glowing
        ctx!.fillStyle = this.color; 
        
        ctx!.fill();
      }

      update(time: number) {
        // More turbulent sine wave movement (faster and higher amplitude)
        const timeFactor = time * 0.0015;
        const waveX = Math.sin(timeFactor + this.baseY * 0.02) * 12; // amplitude 12px
        const waveY = Math.cos(timeFactor + this.baseX * 0.02) * 12; // amplitude 12px

        // Interaction with mouse (Repel effect)
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        let forceDirectionX = dx / distance;
        let forceDirectionY = dy / distance;
        let force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
        let directionX = forceDirectionX * force * this.density;
        let directionY = forceDirectionY * force * this.density;

        if (distance < MOUSE_RADIUS && mouse.isActive) {
          // Repulse points outward violently
          this.x -= directionX * 1.5;
          this.y -= directionY * 1.5;
        } else {
          // Tension string returning them to their origin point + turbulent wave oscillation
          if (this.x !== this.baseX + waveX) {
            let dx = this.x - (this.baseX + waveX);
            this.x -= dx / 15;
          }
          if (this.y !== this.baseY + waveY) {
            let dy = this.y - (this.baseY + waveY);
            this.y -= dy / 15;
          }
        }
      }
    }

    const init = () => {
      particles = [];
      const cols = Math.floor(width / DOT_SPACING);
      const rows = Math.floor(height / DOT_SPACING);
      
      const offsetX = (width - cols * DOT_SPACING) / 2;
      const offsetY = (height - rows * DOT_SPACING) / 2;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          particles.push(new Particle(offsetX + x * DOT_SPACING, offsetY + y * DOT_SPACING));
        }
      }
    };

    const animate = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].draw();
        particles[i].update(time);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      init();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.isActive = true;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.isActive = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    handleResize();
    animate(0);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mounted, resolvedTheme]);

  if (!mounted) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none z-0 ${
        resolvedTheme === 'light' ? 'mix-blend-multiply opacity-30' : 'mix-blend-screen opacity-70'
      }`}
    />
  );
}
