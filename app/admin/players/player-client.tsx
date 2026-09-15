'use client';

import { useRef, useState, useTransition, type ReactNode } from 'react';
import { createPlayer, assignPlayerToTeam } from './actions';

type School = { id: string; name: string };
type Player = { id: string; school_id: string; first_name: string; surname: string; date_of_birth: string | null; gender: string | null; active: boolean };
type Team = { id: string; school_id: string; season_id: string; name: string; age_group: string; status: string };
type Membership = { player_id: string; team_id: string; season_id: string };

function Form({ action, children }: { action: (data: FormData) => Promise<{ ok: boolean; message: string }>; children: ReactNode }) {
  const [pending, start] = useTransition(); const [message, setMessage] = useState(''); const ref = useRef<HTMLFormElement>(null);
  return <form className="admin-form" ref={ref} onSubmit={e => { e.preventDefault(); setMessage(''); const data = new FormData(e.currentTarget); start(async () => { const result = await action(data); setMessage(result.message); if (result.ok) ref.current?.reset(); }); }}>
    {children}<button className="button" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>{message && <div className={message.includes('required') || message.includes('only') || message.includes('found') || message.includes('already') ? 'error' : 'success'}>{message}</div>}
  </form>;
}

export function PlayerClient({ schools, players, teams, memberships }: { schools: School[]; players: Player[]; teams: Team[]; memberships: Membership[] }) {
  const schoolName = (id: string) => schools.find(s => s.id === id)?.name ?? 'Unknown';
  return <>
    <div className="admin-grid">
      <section className="card"><div className="section-title">Add player</div><p className="form-help">Players are persistent JCM records. Team membership is managed separately for each season.</p>
        <Form action={createPlayer}><div className="field"><label>School</label><select name="school_id" required><option value="">Select school…</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="field"><label>First name</label><input name="first_name" required /></div><div className="field"><label>Surname</label><input name="surname" required /></div><div className="field"><label>Date of birth</label><input name="date_of_birth" type="date" /></div><div className="field"><label>Gender</label><select name="gender" defaultValue=""><option value="">Not specified</option><option value="MALE">Male</option><option value="FEMALE">Female</option></select></div></Form>
      </section>
      <section className="card"><div className="section-title">Assign player to team</div><p className="form-help">The database records the season with the team membership, preserving historical rosters.</p>
        <Form action={assignPlayerToTeam}><div className="field"><label>Player</label><select name="player_id" required><option value="">Select player…</option>{players.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.surname} — {schoolName(p.school_id)}</option>)}</select></div><div className="field"><label>Team</label><select name="team_id" required><option value="">Select team…</option>{teams.filter(t => t.status !== 'RETIRED').map(t => <option key={t.id} value={t.id}>{t.name} ({t.age_group})</option>)}</select></div></Form>
      </section>
    </div>
    <section className="card section"><div className="section-title">Player register <span className="count">{players.length}</span></div>{players.length === 0 ? <div className="empty">No players configured yet.</div> : <div className="table-wrap"><table><thead><tr><th>Player</th><th>School</th><th>Date of birth</th><th>Teams</th><th>Status</th></tr></thead><tbody>{players.map(p => { const count = memberships.filter(m => m.player_id === p.id).length; return <tr key={p.id}><td><strong>{p.first_name} {p.surname}</strong></td><td>{schoolName(p.school_id)}</td><td>{p.date_of_birth ?? '—'}</td><td>{count}</td><td><span className="status active">{p.active ? 'Active' : 'Inactive'}</span></td></tr>; })}</tbody></table></div>}</section>
  </>;
}
