'use client';

import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return <button onClick={signOut} style={{ border: '1px solid var(--line)', background: 'white', borderRadius: 8, padding: '7px 11px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Sign out</button>;
}
