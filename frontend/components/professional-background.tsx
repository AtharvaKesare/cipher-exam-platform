'use client';

import { memo, useMemo } from 'react';

// ─────────────────────────────────────────────────────────
// All background effects now use pure CSS animations with
// transform-gpu and will-change:transform to stay on the
// compositor thread. No more framer-motion springs ticking
// on the main thread for decorative elements.
// ─────────────────────────────────────────────────────────

// Neon mesh gradient background - Cyan + Purple + Pink
// Uses CSS keyframes instead of framer-motion animate
export const MeshGradient = memo(() => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Neon Cyan orb - top right */}
      <div
        className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full transform-gpu animate-orb-drift-1"
        style={{
          background: 'radial-gradient(circle, rgba(0, 240, 255, 0.25) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />
      
      {/* Space Purple orb - bottom left */}
      <div
        className="absolute -bottom-[10%] -left-[10%] w-[60%] h-[60%] rounded-full transform-gpu animate-orb-drift-2"
        style={{
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      
      {/* Hot Pink accent orb - center (subtle) */}
      <div
        className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full transform-gpu animate-orb-drift-3"
        style={{
          background: 'radial-gradient(circle, rgba(244, 114, 182, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
    </div>
  );
});
MeshGradient.displayName = 'MeshGradient';

// Subtle grid pattern - pure CSS, zero JS
export const SubtleGrid = memo(() => {
  return (
    <div 
      className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(to right, currentColor 1px, transparent 1px),
          linear-gradient(to bottom, currentColor 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
      }}
    />
  );
});
SubtleGrid.displayName = 'SubtleGrid';

// Floating orbs - deterministic positions, CSS-only animation
export const FloatingOrbs = memo(({ count = 4 }: { count?: number }) => {
  // Deterministic positions to avoid hydration mismatch from Math.random()
  const orbs = useMemo(() => [
    { w: 6, left: '15%', top: '20%', delay: '0s', dur: '5s' },
    { w: 8, left: '65%', top: '40%', delay: '1.2s', dur: '6s' },
    { w: 5, left: '35%', top: '70%', delay: '2.5s', dur: '4.5s' },
    { w: 7, left: '80%', top: '15%', delay: '0.8s', dur: '5.5s' },
  ].slice(0, count), [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full transform-gpu animate-float-orb"
          style={{
            width: orb.w,
            height: orb.w,
            background: 'var(--primary-300, rgba(6, 182, 212, 0.3))',
            left: orb.left,
            top: orb.top,
            animationDelay: orb.delay,
            animationDuration: orb.dur,
          }}
        />
      ))}
    </div>
  );
});
FloatingOrbs.displayName = 'FloatingOrbs';

// Shooting stars - deterministic, CSS-only
export const ShootingStars = memo(({ count = 3 }: { count?: number }) => {
  const stars = useMemo(() => [
    { top: '25%', delay: '2s' },
    { top: '55%', delay: '7s' },
    { top: '40%', delay: '12s' },
  ].slice(0, count), [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute h-[1px] w-[80px] transform-gpu animate-shooting-star"
          style={{
            background: 'linear-gradient(to right, transparent, var(--primary-400, rgba(6, 182, 212, 0.6)), transparent)',
            top: star.top,
            left: '-100px',
            animationDelay: star.delay,
          }}
        />
      ))}
    </div>
  );
});
ShootingStars.displayName = 'ShootingStars';

// Noise texture overlay (pure CSS, using pre-rendered base64 to avoid Brave SVG feTurbulence fingerprinting lag)
export const NoiseTexture = memo(() => {
  return (
    <div 
      className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04] pointer-events-none mix-blend-overlay"
      style={{
        // A simple, tiny pre-rendered noise PNG inside base64 to avoid WebGL / SVG turbulence lag
        backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMwA/bAAAACHRSTlMzMzMzMzMzM8wB/xwAAAB8SURBVDjLxdGxDQAgDMOwM/7/soYUS0uCIt+180pH0pE2v1jZt2T11/xN2bZkdVe9TbVzSWXX/E55y5LeH+mHsmPJoqfyoT1LFl2VD+xZsuiT1qXvsuS61B1L1gflA0u2N+2HsmeJ1QflA0vWBuUDn2yZp/KhH1uW/gHgAQtj3/19lQEAAAAASUVORK5CYII=")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '100px 100px',
      }}
    />
  );
});
NoiseTexture.displayName = 'NoiseTexture';

// Main professional background component
export const ProfessionalBackground = memo(({ 
  showMesh = true,
  showGrid = true,
  showOrbs = true,
  showStars = true,
  showNoise = true,
}: {
  showMesh?: boolean;
  showGrid?: boolean;
  showOrbs?: boolean;
  showStars?: boolean;
  showNoise?: boolean;
}) => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {showMesh && <MeshGradient />}
      {showGrid && <SubtleGrid />}
      {showOrbs && <FloatingOrbs count={4} />}
      {showStars && <ShootingStars count={2} />}
      {showNoise && <NoiseTexture />}
      
      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, var(--background, rgba(0,0,0,0.1)) 100%)',
        }}
      />
    </div>
  );
});
ProfessionalBackground.displayName = 'ProfessionalBackground';

// Hero-specific background (more dramatic but still clean)
export const HeroBackground = memo(() => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Animated gradient orbs - CSS only */}
      <div
        className="absolute -top-[30%] -right-[20%] w-[80%] h-[80%] rounded-full transform-gpu animate-orb-drift-1"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, transparent 60%)',
          filter: 'blur(120px)',
        }}
      />
      
      <div
        className="absolute top-[20%] -left-[20%] w-[60%] h-[60%] rounded-full transform-gpu animate-orb-drift-2"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 60%)',
          filter: 'blur(100px)',
        }}
      />
      
      {/* Subtle grid */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
          maskImage: 'radial-gradient(circle at 50% 50%, black 30%, transparent 80%)',
        }}
      />
      
      {/* Occasional shooting star */}
      <ShootingStars count={1} />
      
      {/* Noise */}
      <NoiseTexture />
      
      {/* Bottom fade for content readability */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
});
HeroBackground.displayName = 'HeroBackground';

// Dashboard/Card background (very subtle)
export const CardAmbientBackground = memo(() => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 20% 20%, var(--primary-50, rgba(6, 182, 212, 0.05)) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, var(--secondary-50, rgba(99, 102, 241, 0.03)) 0%, transparent 50%)
          `,
        }}
      />
    </div>
  );
});
CardAmbientBackground.displayName = 'CardAmbientBackground';
