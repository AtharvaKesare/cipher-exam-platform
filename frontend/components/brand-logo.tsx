'use client';

import { memo } from 'react';

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
}

const sizeMap = {
  sm: { scale: 0.55, textSize: 'text-lg', gap: 'gap-1.5' },
  md: { scale: 0.7, textSize: 'text-2xl', gap: 'gap-2' },
  lg: { scale: 0.9, textSize: 'text-3xl', gap: 'gap-2.5' },
  xl: { scale: 1.15, textSize: 'text-4xl', gap: 'gap-3' },
};

// ─────────────────────────────────────────────────
//  CIPHER ICON — Pure SVG, fully theme-aware
//  Features: "C" ring, circuit traces, </> center,
//  pulsing glow nodes, all via CSS variables
// ─────────────────────────────────────────────────
const CipherIcon = memo(({ scale = 1 }: { scale?: number }) => {
  const s = 80 * scale;

  return (
    <div
      className="relative shrink-0 cipher-icon-wrapper"
      style={{ width: s, height: s }}
    >
      {/* Ambient glow behind the icon */}
      <div
        className="absolute inset-0 rounded-full opacity-60 dark:opacity-80 blur-[12px] cipher-ambient-glow"
        style={{
          background: 'radial-gradient(circle, var(--cipher-glow) 0%, transparent 70%)',
          transform: 'scale(1.4)',
        }}
      />

      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-sm"
        style={{ filter: 'var(--cipher-icon-filter)' }}
      >
        <defs>
          {/* Main gradient for the C ring */}
          <linearGradient id="cRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--cipher-ring-start)" />
            <stop offset="50%" stopColor="var(--cipher-ring-mid)" />
            <stop offset="100%" stopColor="var(--cipher-ring-end)" />
          </linearGradient>

          {/* Inner metallic gradient */}
          <linearGradient id="innerRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--cipher-inner-start)" />
            <stop offset="100%" stopColor="var(--cipher-inner-end)" />
          </linearGradient>

          {/* Center hub gradient */}
          <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--cipher-hub-center)" />
            <stop offset="100%" stopColor="var(--cipher-hub-edge)" />
          </radialGradient>

          {/* Glow filter */}
          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Node glow filter */}
          <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ═══ OUTER C-RING ═══ */}
        {/* C-shape: thick arc with gap on right */}
        <path
          d="M 78 30 A 35 35 0 1 0 78 70"
          stroke="url(#cRingGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
          className="cipher-ring"
        />

        {/* Outer decorative arc — thinner, offset */}
        <path
          d="M 75 26 A 39 39 0 1 0 75 74"
          stroke="var(--cipher-accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.4"
        />

        {/* Inner decorative arc */}
        <path
          d="M 72 34 A 28 28 0 1 0 72 66"
          stroke="url(#innerRingGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />

        {/* ═══ CIRCUIT TRACES ═══ */}
        <g stroke="var(--cipher-trace)" strokeWidth="1" opacity="0.5">
          {/* Top trace */}
          <line x1="50" y1="12" x2="50" y2="6" />
          <line x1="50" y1="6" x2="62" y2="6" />

          {/* Top-right diagonal */}
          <line x1="72" y1="22" x2="82" y2="14" />
          <line x1="82" y1="14" x2="92" y2="14" />

          {/* Right traces extending from gap */}
          <line x1="80" y1="38" x2="94" y2="38" />
          <line x1="80" y1="50" x2="96" y2="50" />
          <line x1="80" y1="62" x2="94" y2="62" />

          {/* Bottom-right */}
          <line x1="72" y1="78" x2="82" y2="86" />
          <line x1="82" y1="86" x2="92" y2="86" />

          {/* Bottom trace */}
          <line x1="50" y1="88" x2="50" y2="94" />
          <line x1="50" y1="94" x2="38" y2="94" />

          {/* Left trace */}
          <line x1="12" y1="50" x2="4" y2="50" />
          <line x1="4" y1="50" x2="4" y2="40" />

          {/* Top-left */}
          <line x1="22" y1="24" x2="14" y2="16" />
          <line x1="14" y1="16" x2="6" y2="16" />
        </g>

        {/* ═══ GLOWING CIRCUIT NODES ═══ */}
        <g filter="url(#nodeGlow)">
          {/* Top */}
          <circle cx="62" cy="6" r="2" fill="var(--cipher-node)" className="cipher-node cipher-node-1" />
          {/* Top-right */}
          <circle cx="92" cy="14" r="2" fill="var(--cipher-node)" className="cipher-node cipher-node-2" />
          {/* Right traces */}
          <circle cx="94" cy="38" r="1.5" fill="var(--cipher-node)" className="cipher-node cipher-node-3" />
          <circle cx="96" cy="50" r="2" fill="var(--cipher-node)" className="cipher-node cipher-node-1" />
          <circle cx="94" cy="62" r="1.5" fill="var(--cipher-node)" className="cipher-node cipher-node-2" />
          {/* Bottom-right */}
          <circle cx="92" cy="86" r="2" fill="var(--cipher-node)" className="cipher-node cipher-node-3" />
          {/* Bottom */}
          <circle cx="38" cy="94" r="2" fill="var(--cipher-node)" className="cipher-node cipher-node-1" />
          {/* Left */}
          <circle cx="4" cy="40" r="2" fill="var(--cipher-node)" className="cipher-node cipher-node-2" />
          {/* Top-left */}
          <circle cx="6" cy="16" r="2" fill="var(--cipher-node)" className="cipher-node cipher-node-3" />
        </g>

        {/* ═══ CENTER HUB ═══ */}
        <circle cx="50" cy="50" r="18" fill="url(#hubGrad)" className="cipher-hub" />
        <circle cx="50" cy="50" r="18" stroke="var(--cipher-hub-ring)" strokeWidth="1.5" fill="none" opacity="0.8" />

        {/* Inner ring detail */}
        <circle cx="50" cy="50" r="14" stroke="var(--cipher-accent)" strokeWidth="0.5" fill="none" opacity="0.3" />

        {/* ═══ CODE BRACKETS </> ═══ */}
        <g filter="url(#glowFilter)">
          {/* < */}
          <path
            d="M 42 44 L 36 50 L 42 56"
            stroke="var(--cipher-bracket)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* / */}
          <line
            x1="47" y1="43"
            x2="53" y2="57"
            stroke="var(--cipher-bracket)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
          {/* > */}
          <path
            d="M 58 44 L 64 50 L 58 56"
            stroke="var(--cipher-bracket)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>

        {/* ═══ ENERGY LINES from gap ═══ */}
        <g opacity="0.6">
          <line
            x1="78" y1="40" x2="88" y2="36"
            stroke="var(--cipher-energy)"
            strokeWidth="1"
            className="cipher-energy-line"
          />
          <line
            x1="79" y1="50" x2="92" y2="50"
            stroke="var(--cipher-energy)"
            strokeWidth="1.5"
            className="cipher-energy-line cipher-energy-delay"
          />
          <line
            x1="78" y1="60" x2="88" y2="64"
            stroke="var(--cipher-energy)"
            strokeWidth="1"
            className="cipher-energy-line"
          />
        </g>
      </svg>
    </div>
  );
});
CipherIcon.displayName = 'CipherIcon';

// ─────────────────────────────────────────────────
//  CIPHER WORDMARK — CSS-styled text, not an image
// ─────────────────────────────────────────────────
const CipherWordmark = memo(({ textSize = 'text-2xl' }: { textSize?: string }) => (
  <div className="flex flex-col">
    <span className={`${textSize} font-black tracking-[0.15em] leading-none cipher-wordmark`}>
      CIPHER
    </span>
    <span className="text-[0.5rem] font-bold tracking-[0.35em] uppercase leading-tight mt-0.5 cipher-tagline opacity-50">
      Secure Exams
    </span>
  </div>
));
CipherWordmark.displayName = 'CipherWordmark';

// ─────────────────────────────────────────────────
//  MAIN EXPORT — BrandLogo
// ─────────────────────────────────────────────────
export const BrandLogo = memo(({
  className = "",
  showText = true,
  size = 'md',
  animated = true
}: BrandLogoProps) => {
  const { scale, textSize, gap } = sizeMap[size];

  return (
    <div className={`flex items-center ${gap} ${className} select-none`}>
      <CipherIcon scale={scale} />
      {showText && <CipherWordmark textSize={textSize} />}
    </div>
  );
});
BrandLogo.displayName = 'BrandLogo';

// Icon-only version
export const CipherIconOnly = memo(({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) => (
  <div className={className}>
    <CipherIcon scale={size / 80} />
  </div>
));
CipherIconOnly.displayName = 'CipherIconOnly';

// Animated version (now just re-exports BrandLogo with lg size)
export const AnimatedBrandLogo = memo(({ className = "" }: { className?: string }) => (
  <BrandLogo size="lg" className={className} />
));
AnimatedBrandLogo.displayName = 'AnimatedBrandLogo';
