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
export function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const { login } = useAuth();
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        try {
            const { apiFetch } = await import("@/lib/api");
            const res = await apiFetch('/users/login', {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setError(err.detail || err.message || "Invalid credentials");
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
    return (<form onSubmit={handleSubmit} className="space-y-5">
      {error && (<Alert variant="destructive" className="animate-in fade-in-50 slide-in-from-top-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>)}

      <div className="space-y-2">
  <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-violet-100">Email</Label>
  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-gray-100 text-gray-800 placeholder-gray-400 rounded-md border border-gray-200 dark:bg-violet-800/70 dark:text-violet-100 dark:placeholder-violet-300 dark:border-violet-700"/>
      </div>

      <div className="space-y-2">
  <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-violet-100">Password</Label>
        <div className="relative">
          <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-12 bg-gray-100 text-gray-800 placeholder-gray-400 rounded-md border border-gray-200 dark:bg-violet-800/70 dark:text-violet-100 dark:placeholder-violet-300 dark:border-violet-700" required/>
          <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 p-0 hover:bg-violet-50 text-slate-500 hover:text-violet-700 dark:text-violet-100 dark:hover:text-white" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
          </Button>
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
    </form>);
}
