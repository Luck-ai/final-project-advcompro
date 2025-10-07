"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import AuthPageLayout from '@/components/auth/AuthPageLayout';

export default function VerifySent() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const e = localStorage.getItem('userEmail');
      if (e) setEmail(e);
    }
    catch (e) {
      // ignore
    }
  }, []);

  const handleResend = async () => {
    if (!email) {
      setMessage('No email available to resend to');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await apiFetch('/users/send-verification', ({ method: 'POST', body: JSON.stringify({ email }), noAuth: true } as any));
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.detail || err.message || 'Failed to resend verification');
      } else {
        const data = await res.json().catch(() => ({ status: 'ok' }));
        setMessage(data.detail || 'Verification email sent');
      }
    }
    catch (err) {
      setMessage('Failed to resend verification. Please try again later.');
    }
    finally {
      setLoading(false);
    }
  };
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
          <CardTitle className="text-xl font-bold mt-2" style={{ color: 'var(--color-card-foreground)' }}>Check your email</CardTitle>
          <CardDescription className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>We sent a verification link to your email address</CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-4">
          <div className="space-y-4">
            <p className="text-base">Thanks for signing up! We've sent a verification email to the address you provided. Click the link in the email to activate your account.</p>
            <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {email ? (
                <>
                  <span>Didn't receive the email to </span>
                  <span className="font-medium">{email}</span>
                  <span>?</span>
                  <button onClick={handleResend} className="ml-2 text-primary underline" disabled={loading}>
                    {loading ? 'Resending...' : 'Resend'}
                  </button>
                </>
              ) : (
                <>
                  <span>Didn't receive the email?</span>
                  <span className="ml-2 font-medium">No email available to resend to</span>
                </>
              )}
              {message && (<div className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>{message}</div>)}
            </div>
            <div className="flex gap-2 justify-end">
              <Link href="/login">
                <Button variant="ghost">Back to sign in</Button>
              </Link>
              <Link href="/signup">
                <Button>Create another account</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </AuthPageLayout>
  );
}
