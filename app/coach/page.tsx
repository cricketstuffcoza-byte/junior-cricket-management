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

  const {data:teams}=await supabase.from('jcm_teams').select('id,name,school_id,age_group');
  const accessible=(teams??[]).filter(t=>isAdmin||schoolIds.includes(t.school_id)).map(t=>t.id);
  const teamFilter=accessible.length?accessible:['00000000-0000-0000-0000-000000000000'];
  const [{data:a},{data:b}]=await Promise.all([
    supabase.from('jcm_matches').select('id,team_a_id,team_b_id,age_group,ruleset,status,scheduled_at,venue_id,competition_id,toss_winner_team_id,toss_decision').in('team_a_id',teamFilter).order('scheduled_at',{ascending:true}),
    supabase.from('jcm_matches').select('id,team_a_id,team_b_id,age_group,ruleset,status,scheduled_at,venue_id,competition_id,toss_winner_team_id,toss_decision').in('team_b_id',teamFilter).order('scheduled_at',{ascending:true})
  ]);
  const matches=[...(a??[]),...(b??[])].filter((m,i,arr)=>arr.findIndex(x=>x.id===m.id)===i).sort((x,y)=>new Date(x.scheduled_at??0).getTime()-new Date(y.scheduled_at??0).getTime());
  const [{data:venues},{data:competitions}]=await Promise.all([
    supabase.from('jcm_venues').select('id,name').eq('active',true),
    supabase.from('jcm_competitions').select('id,name')
  ]);
  const name=(id:string)=>teams?.find(t=>t.id===id)?.name??'Unknown team';
  const venue=(id:string|null)=>venues?.find(v=>v.id===id)?.name??'—';
  const competition=(id:string|null)=>competitions?.find(c=>c.id===id)?.name??'Competition not specified';
  return <div className="shell"><header className="topbar"><div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>Coach Portal</small></div></div><div style={{display:'flex',alignItems:'center',gap:14}}><span className="pill">COACH</span><span style={{fontSize:13,color:'var(--muted)'}}>{user.email}</span><SignOutButton/></div></header><div className="layout"><aside className="sidebar"><div className="nav-label">Coach</div><a className="nav-item active" href="/coach">My Matches</a><a className="nav-item" href="/dashboard">Dashboard</a></aside><main className="main"><div className="banner"><h2>Coach Portal</h2><p>Prepare squads and score your school's matches.</p></div><div className="eyebrow">Live scoring</div><h1>My Matches</h1><p className="subtitle">Matches involving teams from your school access.</p><section className="card section"><div className="section-title">Matches <span className="count">{matches.length}</span></div>{!matches.length?<div className="empty">No matches available.</div>:<div className="table-wrap"><table><thead><tr><th>Match</th><th>Age</th><th>Status</th><th>Scheduled</th><th>Venue</th><th/></tr></thead><tbody>{matches.map(m=>{const ready=Boolean(m.toss_winner_team_id&&m.toss_decision);return <tr key={m.id}><td><strong>{name(m.team_a_id)} vs {name(m.team_b_id)}</strong><small>{competition(m.competition_id)}</small></td><td>{m.age_group}</td><td><span className="status">{m.status}</span></td><td>{m.scheduled_at?new Date(m.scheduled_at).toLocaleString('en-ZA'):'—'}</td><td>{venue(m.venue_id)}</td><td style={{display:'flex',gap:6,flexWrap:'wrap'}}><a className="secondary-button" href={'/operations/matches/'+m.id}>Prepare</a>{ready&&<a className="button" href={'/scoring/'+m.id}>Live scoring</a>}</td></tr>})}</tbody></table></div>}</section></main></div></div>;
}