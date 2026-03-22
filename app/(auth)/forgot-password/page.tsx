"use client";

import { useFormState, useFormStatus } from 'react-dom';
import { requestPasswordReset } from './actions';
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
      {pending ? 'Sending...' : 'Send reset link'}
    </button>
  );
}

export default function ForgotPasswordPage() {
  const [state, action] = useFormState(async (_prev: unknown, formData: FormData) => {
    return requestPasswordReset(formData);
  }, null);

  return (
    <div className="auth-form-inner">
      <div className="auth-logo">
        <span className="auth-logo-icon">🍺</span>
        <span className="auth-logo-name">Bar Ops</span>
      </div>

      <h2>Forgot password?</h2>
      <p className="auth-subtitle">Enter your email address and we&apos;ll send you a reset link.</p>

      {state?.success ? (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#4ade80', fontSize: 14 }}>
          {state.success}
        </div>
      ) : (
        <form action={action}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" placeholder="owner@bar.com" autoComplete="email" required />
          </div>

          {state?.error && (
            <div style={{ background: 'rgba(239,93,96,0.1)', border: '1px solid rgba(239,93,96,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#ff8c8e' }}>
              {state.error}
            </div>
          )}

          <SubmitButton />
        </form>
      )}

      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
        <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>← Back to sign in</Link>
      </div>
    </div>
  );
}
