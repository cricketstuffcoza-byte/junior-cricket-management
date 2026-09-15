'use client';

import { useRef, useState, useTransition } from 'react';
import { bootstrapSystemAdmin, createSchool, createSeason, createTeam } from './actions';

type School = { id: string; name: string; short_name: string | null; code: string; active: boolean };
type Season = { id: string; school_id: string; name: string; year: number; status: string };
type Team = { id: string; school_id: string; season_id: string; name: string; code: string | null; age_group: string; status: string };

function ActionForm({ action, children }: { action: (formData: FormData) => Promise<{ ok: boolean; message: string }>; children: React.ReactNode }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState('');
  const ref = useRef<HTMLFormElement>(null);
  return <form ref={ref} className="admin-form" onSubmit={e => { e.preventDefault(); setMessage(''); const data = new FormData(e.currentTarget); start(async () => { const result = await action(data); setMessage(result.message); if (result.ok) ref.current?.reset(); }); }}>
    {children}
    <button className="button" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>
    {message && <div className={message.includes('required') || message.includes('already') || message.includes('error') ? 'error' : 'success'}>{message}</div>}
  </form>;
}

export function BootstrapCard() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState('');
  return <div className="card admin-bootstrap">
    <div className="section-title">First-time system setup</div>
    <p>Your authenticated account can claim the one-time <strong>System Admin</strong> role. This is only available while no active System Admin exists.</p>
    <button className="button" disabled={pending} onClick={() => start(async () => { const result = await bootstrapSystemAdmin(); setMessage(result.message); if (result.ok) window.location.reload(); })}>{pending ? 'Configuring…' : 'Make me System Admin'}</button>
    {message && <div className="error">{message}</div>}
  </div>;
}

export function AdminClient({ schools, seasons, teams }: { schools: School[]; seasons: Season[]; teams: Team[] }) {
  const schoolName = (id: string) => schools.find(s => s.id === id)?.name ?? 'Unknown school';
  const seasonName = (id: string) => { const s = seasons.find(x => x.id === id); return s ? `${s.name} ${s.year}` : 'Unknown season'; };
  return <>
    <div className="admin-grid">
      <section className="card"><div className="section-title">Add school</div><p className="form-help">Register a school once. It can then have its own seasons, teams, players and staff.</p>
        <ActionForm action={createSchool}><div className="field"><label>School name</label><input name="name" placeholder="Laerskool Wonderboom" required /></div><div className="field"><label>Short name</label><input name="short_name" placeholder="Wonderboom" /></div><div className="field"><label>School code</label><input name="code" placeholder="WON" maxLength={12} required /></div></ActionForm>
      </section>
      <section className="card"><div className="section-title">Create season</div><p className="form-help">A season belongs to a school. Historical seasons remain separate from future seasons.</p>
        <ActionForm action={createSeason}><div className="field"><label>School</label><select name="school_id" required><option value="">Select school…</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="field"><label>Season name</label><input name="name" placeholder="Junior Cricket" required /></div><div className="field"><label>Year</label><input name="year" type="number" min={2000} max={2100} defaultValue={new Date().getFullYear()} required /></div><div className="field"><label>Start date</label><input name="start_date" type="date" /></div><div className="field"><label>End date</label><input name="end_date" type="date" /></div></ActionForm>
      </section>
      <section className="card"><div className="section-title">Create team</div><p className="form-help">Teams are season-specific. The same team name can safely be reused in another season.</p>
        <ActionForm action={createTeam}><div className="field"><label>School</label><select name="school_id" required><option value="">Select school…</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="field"><label>Season</label><select name="season_id" required><option value="">Select season…</option>{seasons.map(s => <option key={s.id} value={s.id}>{schoolName(s.school_id)} — {s.name} {s.year}</option>)}</select></div><div className="field"><label>Team name</label><input name="name" placeholder="O/6 A" required /></div><div className="field"><label>Team code</label><input name="code" placeholder="U6A" maxLength={12} /></div><div className="field"><label>Age group</label><select name="age_group" defaultValue=""><option value="">Select age group…</option><option value="U/6">O/6</option><option value="U/7">O/7</option><option value="U/8">O/8</option></select></div></ActionForm>
      </section>
    </div>

    <section className="card section"><div className="section-title">Schools <span className="count">{schools.length}</span></div>
      {schools.length === 0 ? <div className="empty">No schools configured yet.</div> : <div className="table-wrap"><table><thead><tr><th>School</th><th>Code</th><th>Status</th></tr></thead><tbody>{schools.map(s => <tr key={s.id}><td><strong>{s.name}</strong>{s.short_name && <small>{s.short_name}</small>}</td><td>{s.code}</td><td><span className="status active">{s.active ? 'Active' : 'Inactive'}</span></td></tr>)}</tbody></table></div>}
    </section>
    <section className="card section"><div className="section-title">Seasons <span className="count">{seasons.length}</span></div>
      {seasons.length === 0 ? <div className="empty">No seasons configured yet.</div> : <div className="table-wrap"><table><thead><tr><th>Season</th><th>School</th><th>Status</th></tr></thead><tbody>{seasons.map(s => <tr key={s.id}><td><strong>{s.name} {s.year}</strong></td><td>{schoolName(s.school_id)}</td><td><span className="status">{s.status}</span></td></tr>)}</tbody></table></div>}
    </section>
    <section className="card section"><div className="section-title">Teams <span className="count">{teams.length}</span></div>
      {teams.length === 0 ? <div className="empty">No teams configured yet.</div> : <div className="table-wrap"><table><thead><tr><th>Team</th><th>Age</th><th>School</th><th>Season</th><th>Status</th></tr></thead><tbody>{teams.map(t => <tr key={t.id}><td><strong>{t.name}</strong>{t.code && <small>{t.code}</small>}</td><td>{t.age_group}</td><td>{schoolName(t.school_id)}</td><td>{seasonName(t.season_id)}</td><td><span className="status">{t.status}</span></td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
