"use client";
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppToast } from '@/lib/use-toast';
import { useRouter } from 'next/navigation';
import AuthPageLayout from '@/components/auth/AuthPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { push } = useAppToast();
  const router = useRouter();

  async function handleSend() {
    setLoading(true);
    try {
      const { apiFetch } = await import('@/lib/api');
  const res = await apiFetch('/users/forgot-password', ({ method: 'POST', body: JSON.stringify({ email }), noAuth: true } as any));
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        push({ title: 'Error', description: err.detail || err.message || 'Failed to send reset email', variant: 'error' });
      } else {
        push({ title: 'Sent', description: 'If that email exists, a reset link was sent.', variant: 'success' });
        setSent(true);
      }
    } catch (e) {
      push({ title: 'Error', description: 'Network error. Try again later.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageLayout>
      <Card className="glass-card glass-card--lg w-full">
        <CardHeader className="text-center pt-6 pb-4">
          <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center font-semibold text-lg shadow-sm" aria-hidden style={{ backgroundColor: 'color-mix(in srgb, var(--color-card) 60%, transparent 40%)', color: 'var(--color-primary)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M3 7.5L12 3l9 4.5v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z" stroke="#6D28D9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(124,58,237,0.06)"/>
              <path d="M7 14v-3l5-2 5 2v3" stroke="#6D28D9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <CardTitle className="text-lg font-semibold">Forgot password</CardTitle>
        </CardHeader>
        <CardContent className="px-8 pb-8 pt-2">
          {!sent ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">Enter your email and we'll send a link to reset your password.</p>
              <div className="flex flex-col gap-2 mb-4">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => router.push('/login')}>Cancel</Button>
                <Button onClick={handleSend} disabled={loading}>{loading ? 'Sending...' : 'Send reset'}</Button>
              </div>
            </>
          ) : (
            <div>
              <p className="text-sm mb-4">If that email exists in our system, we've sent a password reset link. Check your inbox.</p>
              <div className="flex justify-end">
                <Button onClick={() => router.push('/login')}>Back to login</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AuthPageLayout>
  );
}
