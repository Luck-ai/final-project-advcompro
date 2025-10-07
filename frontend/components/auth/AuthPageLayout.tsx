import React from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AuthPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative auth-hero overflow-hidden">
      {/* Decorative clouds background (SVG) */}
      <div className="absolute inset-0 -z-10">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1440 600" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <defs>
            <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#efe7ff" />
              <stop offset="60%" stopColor="#f6efff" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
            <radialGradient id="vignette" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(139,92,246,0.06)" />
            </radialGradient>
          </defs>
          <rect width="1440" height="600" fill="url(#g)" />
          <rect width="1440" height="600" fill="url(#vignette)" />
          <g opacity="0.65" fill="#ffffff">
            <ellipse cx="200" cy="360" rx="300" ry="60" />
            <ellipse cx="520" cy="320" rx="340" ry="70" />
            <ellipse cx="920" cy="360" rx="300" ry="60" />
            <ellipse cx="1240" cy="320" rx="260" ry="60" />
          </g>
        </svg>
      </div>

      {/* Top-left small logo (OptiStock) */}
      <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
        <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--sidebar-primary)' }}>
          <span className="text-xs text-white font-bold">OS</span>
        </div>
        <h1 className="text-sm font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" style={{ color: 'var(--color-foreground)' }}>OptiStock</h1>
      </div>

      {/* Top-right theme toggle */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
