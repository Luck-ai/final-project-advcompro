import { SignupForm } from "@/components/auth/signup-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <div className="min-h-screen relative auth-hero overflow-hidden">
      {/* Top-left small logo (OptiStock) */}
      <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
        <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--sidebar-primary)' }}>
          <span className="text-xs text-white font-bold">OS</span>
        </div>
        <h1 className="text-sm font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" style={{ color: 'var(--color-foreground)' }}>OptiStock</h1>
      </div>

      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card className="glass-card glass-card--lg w-full">
            <CardHeader className="text-center pt-6 pb-4" style={{ color: 'var(--color-card-foreground)' }}>
              <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center font-semibold text-lg shadow-sm" aria-hidden style={{ backgroundColor: 'color-mix(in srgb, var(--color-card) 60%, transparent 40%)', color: 'var(--color-primary)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M3 7.5L12 3l9 4.5v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z" stroke="#6D28D9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(124,58,237,0.06)"/>
                  <path d="M7 14v-3l5-2 5 2v3" stroke="#6D28D9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <CardTitle className="text-xl font-bold mt-2" style={{ color: 'var(--color-card-foreground)' }}>Create Account</CardTitle>
              <CardDescription className="text-sm mt-1 max-w-xs mx-auto" style={{ color: 'var(--muted-foreground)' }}>Join OptiStock to start managing your inventory efficiently.</CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8 pt-2">
              <SignupForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
