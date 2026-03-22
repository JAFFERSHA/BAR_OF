"use client";

import { useFormState, useFormStatus } from 'react-dom';
import { login } from './actions';
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
      {pending ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
            </path>
          </svg>
          Signing in...
        </>
      ) : 'Sign in'}
    </button>
  );
}

export default function LoginPage() {
  const [error, action] = useFormState(login, null);

  return (
    <div className="auth-form-inner">
      {/* Logo */}
      <div className="auth-logo">
        <span className="auth-logo-icon">🍺</span>
        <span className="auth-logo-name">Bar Ops</span>
      </div>

      <h2>Welcome back</h2>
      <p className="auth-subtitle">Sign in to manage your bar inventory and billing.</p>

      <form action={action}>
        <div className="field">
          <label htmlFor="identifier">Email or phone</label>
          <input
            id="identifier"
            name="identifier"
            placeholder="owner@bar.test"
            autoComplete="username"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239,93,96,0.1)',
              border: '1px solid rgba(239,93,96,0.25)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 12,
              fontSize: 13,
              color: '#ff8c8e',
            }}
          >
            {error}
          </div>
        )}

        <SubmitButton />
      </form>

      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
        <Link href="/forgot-password" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
