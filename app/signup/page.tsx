"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  resendCompanySignupOtp,
  startCompanySignup,
  verifyCompanySignup,
} from '@/app/admin/lib/api';
import { AuthShell } from '@/app/components/landing/AuthShell';

const inputClass =
  'w-full rounded-xl border border-white/10 bg-brand-900/50 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/25';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onStart(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const result = await startCompanySignup({
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        email: email.trim(),
        password,
      });
      setNotice(result.message);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start signup');
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    setLoading(true);
    try {
      await verifyCompanySignup(email.trim(), code.trim());
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify');
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const result = await resendCompanySignupOtp(email.trim());
      setNotice(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={step === 'details' ? 'Register your carrier' : 'Verify your email'}
      subtitle={
        step === 'details'
          ? 'We’ll email a code before creating your company. Your fleet starts empty — only your data.'
          : `Enter the 6-digit code sent to ${email}. Your account is created only after verification.`
      }
      panelTitle="Stand up a cargo company securely"
      panelBody="OTP is sent with the SaaS platform SMTP. After verify you get an empty tenant — no other company data, no demo fleet."
      footer={
        <>
          Already running a fleet?{' '}
          <Link href="/admin/login" className="font-semibold text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
          {' · '}
          <Link href="/" className="font-semibold text-brand-400 hover:text-brand-300">
            Home
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-5 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
          {notice}
        </div>
      )}

      {step === 'details' ? (
        <form onSubmit={onStart} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Your name</label>
            <input
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
              placeholder="Alex Morgan"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Carrier / company name</label>
            <input
              required
              minLength={2}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputClass}
              placeholder="Northline Freight"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Work email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="owner@northlinefreight.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-11`}
                placeholder="At least 6 characters"
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
            className="mt-2 flex w-full items-center justify-center rounded-full bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60"
          >
            {loading ? 'Sending code…' : 'Send verification code'}
          </button>
        </form>
      ) : (
        <form onSubmit={onVerify} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={`${inputClass} tracking-[0.35em]`}
              placeholder="000000"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-full bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60"
          >
            {loading ? 'Creating company…' : 'Verify & create company'}
          </button>
          <button
            type="button"
            onClick={onResend}
            disabled={loading}
            className="w-full text-center text-sm text-slate-400 transition hover:text-brand-300 disabled:opacity-60"
          >
            Resend code
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('details');
              setCode('');
              setNotice(null);
              setError(null);
            }}
            className="w-full text-center text-sm text-slate-500 transition hover:text-slate-300"
          >
            ← Edit details
          </button>
        </form>
      )}
    </AuthShell>
  );
}
