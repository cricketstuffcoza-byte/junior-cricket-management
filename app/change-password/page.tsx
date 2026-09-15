'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password, data: { force_password_change: false } });
    if (updateError) { setError(updateError.message); setLoading(false); return; }
    window.location.href = '/dashboard';
  }

  return (
    <main className="login-wrap">
      <section className="login-card">
        <div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>JCM Platform</small></div></div>
        <div style={{ marginTop: 34 }}>
          <div className="eyebrow">First login</div>
          <h1>Set your password</h1>
          <p className="subtitle">Your administrator gave you a temporary password. Choose a new private password before continuing.</p>
        </div>
        <form onSubmit={changePassword}>
          <div className="field"><label htmlFor="password">New password</label><input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" /></div>
          <div className="field"><label htmlFor="confirm">Confirm new password</label><input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" /></div>
          {error && <div className="error">{error}</div>}
          <button className="button" disabled={loading}>{loading ? 'Updating…' : 'Set new password'}</button>
        </form>
      </section>
    </main>
  );
}
