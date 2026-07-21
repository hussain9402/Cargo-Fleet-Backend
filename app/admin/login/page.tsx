"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../lib/api';
import { AuthShell } from '@/app/components/landing/AuthShell';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === '1') {
      setNotice('Password updated. You can sign in with your new password.');
    } else if (params.get('reason') === 'session') {
      setNotice('Your session expired. Please sign in again.');
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Sign in to your fleet"
      subtitle="Carriers and platform admins use the same console — your role opens the right view."
      panelTitle="Your cargo network, one login"
      panelBody="Open the yard board, live corridors, and company settings. Super admins run the SaaS; owners run the carrier."
      footer={
        <>
          New carrier?{' '}
          <Link href="/signup" className="font-semibold text-brand-400 hover:text-brand-300">
            Create account
          </Link>
          {' · '}
          <Link href="/" className="font-semibold text-brand-400 hover:text-brand-300">
            Home
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-5 rounded-lg border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
          {notice}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Work email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-brand-900/50 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/25"
            placeholder="dispatch@yourfleet.com"
            autoFocus
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-300">Password</label>
            <Link
              href="/admin/forgot-password"
              className="text-xs font-medium text-brand-400 transition hover:text-brand-300"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-brand-900/50 py-2.5 pl-3.5 pr-11 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/25"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition hover:text-slate-300"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_-10px_rgba(26,82,196,0.4)] transition hover:bg-brand-500 disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
