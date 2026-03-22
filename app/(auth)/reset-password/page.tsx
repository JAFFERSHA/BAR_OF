"use client";

import { Suspense } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { resetPassword } from './actions';
import Link from 'next/link';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="button"
      type="submit"
      disabled={pending}
      style={{ width: '100%', marginTop: 8, padding: '12px', fontSize: '14px', justifyContent: 'center' }}
    >
      {pending ? 'Saving...' : 'Set new password'}
    </button>
  );
}

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [state, action] = useFormState(async (_prev: unknown, formData: FormData) => {
    formData.set('token', token);
    return resetPassword(formData);
  }, null);

  if (!token) {
    return (
      <>
        <p style={{ color: '#ff8c8e', textAlign: 'center' }}>Invalid reset link. Please request a new one.</p>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link href="/forgot-password" style={{ color: 'var(--accent)', fontSize: 14 }}>Request new link</Link>
        </div>
      </>
    );
  }

  if (state?.success) {
    return (
      <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#4ade80', fontSize: 14 }}>
        {state.success}
        <div style={{ marginTop: 12 }}>
          <Link href="/login" className="button" style={{ display: 'inline-block', padding: '8px 20px', fontSize: 13 }}>Sign in now</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="password">New password</label>
        <input id="password" name="password" type="password" placeholder="••••••••" minLength={6} autoComplete="new-password" required />
      </div>
      <div className="field">
        <label htmlFor="confirm">Confirm password</label>
        <input id="confirm" name="confirm" type="password" placeholder="••••••••" minLength={6} autoComplete="new-password" required />
      </div>

      {state?.error && (
        <div style={{ background: 'rgba(239,93,96,0.1)', border: '1px solid rgba(239,93,96,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#ff8c8e' }}>
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-form-inner">
      <div className="auth-logo">
        <span className="auth-logo-icon">🍺</span>
        <span className="auth-logo-name">Bar Ops</span>
      </div>

      <h2>Set new password</h2>
      <p className="auth-subtitle">Choose a strong password for your account.</p>

      <Suspense fallback={<p className="muted" style={{ textAlign: 'center' }}>Loading...</p>}>
        <ResetForm />
      </Suspense>

      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
        <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>← Back to sign in</Link>
      </div>
    </div>
  );
}
