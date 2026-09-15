'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.user?.user_metadata?.force_password_change === true) {
      window.location.href = '/change-password';
      return;
    }
    window.location.href = '/dashboard';
  }

  return (
    <main className="login-wrap">
      <section className="login-card">
        <div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>JCM Platform</small></div></div>
        <div style={{ marginTop: 34 }}>
          <div className="eyebrow">Secure sign in</div>
          <h1>Welcome back</h1>
          <p className="subtitle">Sign in to access your JCM portal.</p>
        </div>
        <form onSubmit={signIn}>
          <div className="field"><label htmlFor="email">Email address</label><input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></div>
          <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></div>
          {error && <div className="error">{error}</div>}
          <button className="button" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  );
}
