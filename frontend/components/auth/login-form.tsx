"use client";
import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useAppToast } from '@/lib/use-toast';
export function LoginForm() {
    const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
    const router = useRouter();
    const { login } = useAuth();
  const { push } = useAppToast();
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        try {
            const { apiFetch } = await import("@/lib/api");
      const res = await apiFetch('/users/login', ({
        method: "POST",
        body: JSON.stringify({ email, password }),
        // don't treat 401 from login as token expiry for existing sessions
        noAuth: true,
      } as any));
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
        const msg = err.detail || err.message || "Invalid credentials";
        setError(msg);
        // leave function so UI can render resend link for unverified users
                return;
            }
            const data = await res.json();
            if (data && data.access_token) {
                login(data.access_token, data.token_type || 'bearer', data.email || email);
                router.push("/dashboard");
            }
        }
        catch (err) {
            setError("Login failed. Please check your connection and try again.");
        }
        finally {
            setIsLoading(false);
        }
    };

  const handleResend = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setResendMessage("");
    setResendLoading(true);
    try {
      const { apiFetch } = await import("@/lib/api");
      const res = await apiFetch('/users/send-verification', ({ method: 'POST', body: JSON.stringify({ email }), noAuth: true } as any));
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setResendMessage(err.detail || err.message || 'Failed to resend verification');
      }
      else {
        const data = await res.json().catch(() => ({ status: 'ok' }));
        setResendMessage(data.detail || 'Verification email sent');
        try {
          localStorage.setItem('userEmail', email || (data?.email || ''));
        } catch (e) {
          // ignore
        }
        router.push('/signup/verify-sent');
      }
    }
    catch (err) {
      setResendMessage('Failed to resend verification. Please try again later.');
    }
    finally {
      setResendLoading(false);
    }
  };
    const isNotVerified = error && typeof error === 'string' && error.toLowerCase().includes('not verified');

    return (<form onSubmit={handleSubmit} className="space-y-5">
      {error && (<Alert variant="destructive" className="animate-in fade-in-50 slide-in-from-top-2">
          <AlertDescription>
            <div>{error}</div>
            {isNotVerified && (<div className="mt-2 text-sm">
                <a href="#" onClick={handleResend} className="text-sm font-medium text-violet-700 hover:underline" aria-disabled={resendLoading}>
                  {resendLoading ? 'Resending...' : 'Resend verification email'}
                </a>
                {resendMessage && (<div className="text-xs text-slate-700 dark:text-violet-100 mt-1">{resendMessage}</div>)}
              </div>)}
          </AlertDescription>
        </Alert>)}

      <div className="space-y-2">
  <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-violet-100">Email</Label>
  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="space-y-2">
  <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-violet-100">Password</Label>
        <div>
          <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required/>
        </div>
      </div>

      <Button type="submit" className="w-full mt-6" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
        Sign In
      </Button>

      <div className="text-center text-sm pt-2">
        <span className="text-slate-500">Don't have an account? </span>
        <Link href="/signup" className="text-violet-700 font-medium hover:text-violet-800 hover:underline">
          Sign up
        </Link>
      </div>
      <div className="text-center text-sm pt-2">
        <Link href="/forgot-password" className="text-sm text-slate-500 hover:underline">Forgot password?</Link>
      </div>
    </form>);
}
