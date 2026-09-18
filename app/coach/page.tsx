import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '../dashboard/sign-out-button';

export const dynamic='force-dynamic';

export default async function CoachPortalPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login');

  const [{data:roles},{data:links}]=await Promise.all([
    supabase.from('jcm_user_roles').select('role').eq('user_id',user.id).eq('active',true),
    supabase.from('jcm_school_users').select('school_id,role').eq('user_id',user.id).eq('active',true)
  ]);
  const isAdmin=(roles??[]).some(r=>r.role==='SYSTEM_ADMIN');
  const schoolIds=(links??[]).filter(x=>['COACH','SCHOOL_ADMIN'].includes(x.role)).map(x=>x.school_id);
  if(!isAdmin&&!schoolIds.length) redirect('/dashboard');

  const {data:matches,error}=await supabase.rpc('jcm_coach_match_feed');
  type CoachMatch = NonNullable<typeof matches>[number];
  if(error) throw new Error(error.message);

  return <div className="shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>Coach Portal</small></div></div>
      <div style={{display:'flex',alignItems:'center',gap:14}}><span className="pill">COACH</span><span style={{fontSize:13,color:'var(--muted)'}}>{user.email}</span><SignOutButton/></div>
    </header>
    <div className="layout">
      <aside className="sidebar"><div className="nav-label">Coach</div><a className="nav-item active" href="/coach">My Matches</a><a className="nav-item" href="/dashboard">Dashboard</a></aside>
      <main className="main">
        <div className="banner"><h2>Coach Portal</h2><p>Prepare squads and score your school's matches.</p></div>
        <div className="eyebrow">Live scoring</div><h1>My Matches</h1><p className="subtitle">Matches involving teams from your school access.</p>
        <section className="card section">
          <div className="section-title">Matches <span className="count">{matches?.length??0}</span></div>
          {!matches?.length?<div className="empty">No matches available.</div>:<div className="table-wrap"><table><thead><tr><th>Match</th><th>Age</th><th>Status</th><th>Scheduled</th><th>Venue</th><th/></tr></thead><tbody>
            {matches.map((m:CoachMatch)=>{const ready=Boolean(m.toss_winner_team_id&&m.toss_decision);return <tr key={m.id}>
              <td><strong>{m.team_a_name} vs {m.team_b_name}</strong><small>{m.competition_name??'Competition not specified'}</small></td>
              <td>{m.age_group}</td><td><span className="status">{m.status}</span></td>
              <td>{m.scheduled_at?new Date(m.scheduled_at).toLocaleString('en-ZA'):'—'}</td>
              <td>{m.venue_name??'—'}</td>
              <td style={{display:'flex',gap:6,flexWrap:'wrap'}}><a className="secondary-button" href={'/operations/matches/'+m.id}>Prepare</a>{ready&&<a className="button" href={'/scoring/'+m.id}>Live scoring</a>}</td>
            </tr>})}
          </tbody></table></div>}
        </section>
      </main>
    </div>
  </div>;
}
