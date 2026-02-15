"use client";

import { useFormState, useFormStatus } from 'react-dom';
import { login } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button" type="submit" disabled={pending} style={{ width: '100%', marginTop: 6 }}>
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

export default function LoginPage() {
  const [error, action] = useFormState(login, null);

  return (
    <div
      style={{
        width: 420,
        background: 'rgba(18, 26, 52, 0.9)',
        border: '1px solid #1f2746',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 24px 60px rgba(0,0,0,0.45)'
      }}
    >
      <h2 style={{ margin: 0, marginBottom: 8 }}>Welcome back</h2>
      <p className="muted" style={{ marginTop: 0, marginBottom: 18 }}>
        Sign in with your email or phone number.
      </p>
      <form action={action}>
        <div className="field">
          <label htmlFor="identifier">Email or phone</label>
          <input id="identifier" name="identifier" placeholder="owner@bar.test or +1..." required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" placeholder="••••••••" required />
        </div>
        {error && (
          <div className="muted danger-text" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}
        <SubmitButton />
        <div className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          Demo users: owner@bar.test / manager@bar.test / staff@bar.test (password: Passw0rd!)
        </div>
      </form>
    </div>
  );
}
