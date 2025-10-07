"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppToast } from '@/lib/use-toast';
import AuthPageLayout from '@/components/auth/AuthPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params?.get('token') || '';
  const email = params?.get('email') || '';
  const { push } = useAppToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // nothing special, but ensure token/email present
    if (!token || !email) {
      setError('Invalid reset link.');
    }
  }, [token, email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newPassword || !confirmPassword) {
      setError('Please fill both password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { apiFetch } = await import('@/lib/api');
  const res = await apiFetch('/users/reset-password', ({ method: 'POST', body: JSON.stringify({ token, email, new_password: newPassword }), noAuth: true } as any));
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        push({ title: 'Reset failed', description: err.detail || err.message || 'Failed to reset password', variant: 'error' });
        setError(err.detail || err.message || 'Failed to reset password');
        return;
      }
      push({ title: 'Password reset', description: 'Your password has been reset. You can now sign in.', variant: 'success' });
      router.push('/login');
    } catch (e) {
      push({ title: 'Reset failed', description: 'Network error. Try again later.', variant: 'error' });
      setError('Network error. Try again later.');
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
          <CardTitle className="text-lg font-semibold">Reset password</CardTitle>
        </CardHeader>
        <CardContent className="px-8 pb-8 pt-2">
          <p className="text-sm text-muted-foreground mb-4">Set a new password for <strong>{email}</strong></p>
          {error && (<div className="mb-3 text-sm text-destructive">{error}</div>)}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthPageLayout>
  );
}
