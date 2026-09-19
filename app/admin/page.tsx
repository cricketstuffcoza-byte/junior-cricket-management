import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '../dashboard/sign-out-button';
import { AdminClient, BootstrapCard } from './admin-client';
import { MobileNav } from '../mobile-nav';
import { MatchScorerAssignment } from '../components/match-scorer-assignment';

export default async function AdminPage() {
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect('/login');
  const {data:role}=await supabase.from('jcm_user_roles').select('role').eq('user_id',user.id).eq('role','SYSTEM_ADMIN').eq('active',true).maybeSingle();
  if(!role) return <div className="shell"><header className="topbar"><div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>System Administration</small></div></div><SignOutButton/></header><main className="main"><div className="eyebrow">System administration</div><h1>System Owner setup</h1><p className="subtitle">The platform is ready, but this account is not yet an active System Admin.</p><BootstrapCard/></main></div>;
  const [{data:schools},{data:seasons},{data:teams},{data:matches}]=await Promise.all([
    supabase.from('jcm_schools').select('id,name,short_name,code,active').order('name'),
    supabase.from('jcm_seasons').select('id,school_id,name,year,status').order('year',{ascending:false}),
    supabase.from('jcm_teams').select('id,school_id,season_id,name,code,age_group,status').order('name'),
    supabase.rpc('jcm_coach_match_feed')
  ]);
  const {data:roleUsers}=await supabase.from('jcm_user_roles').select('user_id').in('role',['COACH','SCORER']).eq('active',true);
  const assignableIds=[...new Set((roleUsers??[]).map(x=>x.user_id))];
  const {data:assignableUsers}=assignableIds.length
    ? await supabase.from('jcm_users').select('user_id,full_name,email').in('user_id',assignableIds)
    : {data:[]};
  return <div className="shell"><header className="topbar"><div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>System Administration</small></div></div><div style={{display:'flex',alignItems:'center',gap:10}}><MobileNav isSystemAdmin={true} active="admin"/><span className="pill">SYSTEM ADMIN</span><span style={{fontSize:13,color:'var(--muted)'}}>{user.email}</span><SignOutButton/></div></header><div className="layout"><aside className="sidebar"><div className="nav-label">System</div><a className="nav-item active" href="/admin">System Admin</a><a className="nav-item" href="/admin/users">Users & Roles</a><a className="nav-item" href="/admin/players">Players</a><a className="nav-item" href="/dashboard">Dashboard</a><div className="nav-label" style={{marginTop:14}}>Configuration</div><a className="nav-item" href="#schools">Schools</a><a className="nav-item" href="#seasons">Seasons</a><a className="nav-item" href="#teams">Teams</a><a className="nav-item" href="#matches">Matches</a><div className="nav-label" style={{marginTop:14}}>Coming next</div><span className="nav-item" style={{opacity:.55}}>Competitions</span><span className="nav-item" style={{opacity:.55}}>Venues</span></aside><main className="main"><div className="banner"><h2>System Owner Portal</h2><p>Configure the multi-school JCM platform. All changes are scoped to the new JCM tables; the legacy scoring system remains untouched.</p></div><div className="eyebrow">Platform configuration</div><h1>Build the cricket structure</h1><p className="subtitle">Start with schools, create their seasons, then create season-specific O/6, O/7 and O/8 teams.</p><AdminClient schools={schools??[]} seasons={seasons??[]} teams={teams??[]}/>
<section id="matches" className="card section"><div className="section-title">Existing matches <span className="count">{(matches??[]).length}</span></div>
<p className="form-help">Assign any active Coach or Scorer to an existing match. System Admin can assign users across all schools.</p>
{(matches??[]).length===0?<div className="empty">No matches prepared yet.</div>:<div className="table-wrap"><table><thead><tr><th>Match</th><th>Age</th><th>Status</th><th>Scheduled</th><th>Coach / Scorer</th></tr></thead><tbody>{(matches??[]).map((m:any)=><tr key={m.id}><td><strong>{m.team_a_name} vs {m.team_b_name}</strong><small>{m.ruleset}</small></td><td>{m.age_group}</td><td><span className="status">{m.status}</span></td><td>{m.scheduled_at?new Date(m.scheduled_at).toLocaleString('en-ZA'):'—'}</td><td><MatchScorerAssignment matchId={m.id} currentUserId={m.scorer_user_id??null} users={(assignableUsers??[])}/></td></tr>)}</tbody></table></div>}
</section></main></div></div>;
}
