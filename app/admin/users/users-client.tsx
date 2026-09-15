'use client';

import { useRef, useState, useTransition } from 'react';
import { grantUserAccess, setUserActive } from './actions';

type School = { id: string; name: string };
type UserRow = { user_id: string; email: string | null; full_name: string | null; phone: string | null; last_sign_in_at: string | null; global_roles: string[]; school_roles: { school_id: string; school_name: string; role: string; active: boolean }[] };

function AccessForm({ schools }: { schools: School[] }) {
  const [pending, start] = useTransition(); const [message, setMessage] = useState(''); const ref = useRef<HTMLFormElement>(null);
  return <section className="card">
    <div className="section-title">Grant JCM access</div>
    <p className="form-help">The person must already have an authenticated JCM account. Enter the email they used to sign up, then assign their school role.</p>
    <form ref={ref} className="admin-form" onSubmit={e => { e.preventDefault(); setMessage(''); const fd = new FormData(e.currentTarget); start(async () => { const r = await grantUserAccess(fd); setMessage(r.message); if (r.ok) ref.current?.reset(); }); }}>
      <div className="field"><label>Email address</label><input name="email" type="email" placeholder="coach@school.co.za" required /></div>
      <div className="field"><label>Full name</label><input name="full_name" placeholder="Coach Name" /></div>
      <div className="field"><label>Phone</label><input name="phone" placeholder="082 000 0000" /></div>
      <div className="field"><label>Role</label><select name="role" defaultValue="" required><option value="">Select role…</option><option value="SCHOOL_ADMIN">School Admin</option><option value="COACH">Coach</option><option value="SCORER">Scorer</option><option value="PARENT">Parent</option></select></div>
      <div className="field"><label>School</label><select name="school_id" defaultValue="" required><option value="">Select school…</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      <button className="button" type="submit" disabled={pending}>{pending ? 'Granting…' : 'Grant access'}</button>
      {message && <div className={message.includes('required') || message.includes('No authenticated') || message.includes('Invalid') ? 'error' : 'success'}>{message}</div>}
    </form>
  </section>;
}

function UserCard({ user }: { user: UserRow }) {
  const [pending, start] = useTransition(); const [message, setMessage] = useState('');
  const active = user.school_roles.some(r => r.active) || user.global_roles.some(r => r !== 'SYSTEM_ADMIN');
  return <div className="user-row">
    <div className="user-main"><strong>{user.full_name || 'Unnamed user'}</strong><span>{user.email || 'No email'}</span>{user.phone && <span>{user.phone}</span>}</div>
    <div className="user-access"><div className="role-tags">{user.global_roles.map(r => <span className="pill" key={r}>{r.replaceAll('_',' ')}</span>)}</div>{user.school_roles.map((r, i) => <div className="school-role" key={`${r.school_id}-${r.role}-${i}`}><strong>{r.school_name}</strong> · {r.role.replaceAll('_',' ')} {r.active ? '' : '· inactive'}</div>)}</div>
    <div className="user-meta">{user.last_sign_in_at ? `Last sign-in ${new Date(user.last_sign_in_at).toLocaleDateString()}` : 'Never signed in'}<button className="secondary-button" disabled={pending} onClick={() => start(async () => { const r = await setUserActive(user.user_id, !active); setMessage(r.message); })}>{active ? 'Deactivate access' : 'Restore access'}</button>{message && <small>{message}</small>}</div>
  </div>;
}

export function UsersClient({ schools, users }: { schools: School[]; users: UserRow[] }) {
  return <><AccessForm schools={schools}/><section className="card section"><div className="section-title">JCM users <span className="count">{users.length}</span></div>{users.length === 0 ? <div className="empty">No authenticated accounts found.</div> : <div className="user-list">{users.map(u => <UserCard key={u.user_id} user={u}/>)}</div>}</section></>;
}
