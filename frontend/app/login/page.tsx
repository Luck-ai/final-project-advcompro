import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AuthPageLayout from '@/components/auth/AuthPageLayout';

export default function LoginPage() {
  return (
    <AuthPageLayout>
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
        <CardContent className="px-8 pb-8 pt-4">
          <LoginForm />
        </CardContent>
      </Card>
    </AuthPageLayout>
  );
}
