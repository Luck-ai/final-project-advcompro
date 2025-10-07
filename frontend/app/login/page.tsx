import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';

export default function LoginPage() {
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

      {/* Centered translucent card */}
      <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
          <Card className="glass-card glass-card--lg w-full">
            <CardHeader className="text-center pt-8 pb-6" style={{ color: 'var(--color-card-foreground)' }}>
              <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center font-semibold text-lg shadow-sm" aria-hidden style={{ backgroundColor: 'color-mix(in srgb, var(--color-card) 60%, transparent 40%)', color: 'var(--color-primary)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M3 7.5L12 3l9 4.5v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z" stroke="#6D28D9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(124,58,237,0.06)"/>
                  <path d="M7 14v-3l5-2 5 2v3" stroke="#6D28D9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <CardTitle className="text-xl font-bold mt-4" style={{ color: 'var(--color-card-foreground)' }}>Sign in with email</CardTitle>
              <CardDescription className="text-sm mt-2 max-w-xs mx-auto" style={{ color: 'var(--color-muted-foreground)' }}>Track inventory levels, manage suppliers, and analyze sales to avoid stockouts and optimize reorder decisions.</CardDescription>
            </CardHeader>
              <CardContent className="px-8 pb-8 pt-4 [&_input]:bg-[var(--color-input)] [&_input]:text-[var(--color-card-foreground)] [&_input]:placeholder-[var(--muted-foreground)] [&_input]:rounded-md [&_input]:border [&_input]:border-[var(--color-border)]">
                <LoginForm />

              </CardContent>
            </Card>

        </div>
      </div>
    </div>
  );
}
