'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
export default function AuthRouteWrapper({ children }: {
    children: React.ReactNode;
}) {
    const pathname = usePathname() ?? '/';
    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/verify');
    const className = isAuthRoute ? 'min-h-screen bg-auth-background text-auth-foreground' : 'min-h-screen bg-background text-foreground';
    const style = isAuthRoute ? { backgroundColor: 'var(--auth-background)' } : { backgroundColor: 'var(--background)' };
    return (<div className={className} style={style}>
      {children}
    </div>);
}
