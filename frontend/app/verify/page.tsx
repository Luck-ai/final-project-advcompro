"use client";
import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
export default function VerifyPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
    const [message, setMessage] = useState('Verifying...');
    const runVerify = async () => {
        const token = searchParams.get('token');
        const email = searchParams.get('email');
        if (!token || !email) {
            setStatus('error');
            setMessage('Missing token or email');
            return;
        }
        try {
            const res = await apiFetch(`/users/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setStatus('error');
                setMessage(err.detail || err.message || 'Verification failed');
                return;
            }
            const data = await res.json();
            setStatus('success');
            setMessage(data.detail || 'Email verified');
            setTimeout(() => router.push('/login'), 1500);
        }
        catch (e) {
            setStatus('error');
            setMessage('Verification failed. Please try again later.');
        }
    };
    useEffect(() => {
        runVerify();
    }, []);
    return (
    <div className="min-h-screen relative auth-hero overflow-hidden">
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
        <div className="w-full max-w-lg">
          <Card className="glass-card glass-card--lg w-full">
            <CardHeader className="text-center pt-8 pb-6" style={{ color: 'var(--color-card-foreground)' }}>
              <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center font-semibold text-lg shadow-sm" aria-hidden style={{ backgroundColor: 'color-mix(in srgb, var(--color-card) 60%, transparent 40%)', color: 'var(--color-primary)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M3 7.5L12 3l9 4.5v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z" stroke="#6D28D9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(124,58,237,0.06)"/>
                  <path d="M7 14v-3l5-2 5 2v3" stroke="#6D28D9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <CardTitle className="text-xl font-bold mt-2" style={{ color: 'var(--color-card-foreground)' }}>Email verification</CardTitle>
              <CardDescription className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>Confirm your email to finish setting up your account</CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8 pt-4">
              <div className="space-y-4">
                <p className={`text-base ${status === 'error' ? 'text-red-600' : status === 'success' ? 'text-green-600' : ''}`} style={{ color: status === 'error' ? undefined : status === 'success' ? undefined : 'var(--color-foreground)' }}>{message}</p>
                <div className="flex gap-2 justify-end">
                  {status === 'error' ? (<>
                      <Button variant="ghost" onClick={runVerify}>Retry</Button>
                      <Link href="/signup"><Button>Create account</Button></Link>
                    </>) : status === 'success' ? (<Link href="/login"><Button>Go to sign in</Button></Link>) : (<Button variant="ghost">Verifying...</Button>)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    );
}
