import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '../dashboard/sign-out-button';
import { MobileNav } from '../mobile-nav';

export const dynamic='force-dynamic';

type CoachMatch = {
  id:string; fixture_id:string|null; team_a_id:string; team_a_name:string; team_b_id:string; team_b_name:string;
  age_group:string; ruleset:string; status:string; scheduled_at:string|null; venue_id:string|null; venue_name:string|null;
  competition_id:string|null; competition_name:string|null; season_id:string|null; season_name:string|null; season_year:number|null;
  fixture_type:string|null; fixture_status:string|null; availability_deadline:string|null; fixture_notes:string|null;
  toss_winner_team_id:string|null; toss_decision:string|null; scorer_user_id:string|null;
  result_winner_team_id:string|null; result_reason:string|null; result_margin:string|null; current_score:string|null;
};
type AssignedUser={user_id:string;full_name:string|null;email:string|null};

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
  if(error) throw new Error(error.message);
  const coachMatches=(matches??[]) as CoachMatch[];

  const matchIds=coachMatches.map(m=>m.id);
  const {data:innings}=matchIds.length
    ? await supabase.from('jcm_innings').select('id,match_id,innings_no,batting_team_id,runs,wickets,legal_balls,completed').in('match_id',matchIds).order('innings_no')
    : {data:[]};
  const inningsRows=(innings??[]) as {id:string;match_id:string;innings_no:number;batting_team_id:string|null;runs:number;wickets:number;legal_balls:number;completed:boolean}[];
  const teamNames=new Map<string,string>();
  for(const m of coachMatches){teamNames.set(m.team_a_id,m.team_a_name);teamNames.set(m.team_b_id,m.team_b_name);}
  const scoreText=(i:typeof inningsRows[number])=>{
    const legal=i.legal_balls??0;
    const overs=Math.floor(legal/8);
    const balls=legal%8;
    return `${i.runs??0}/${i.wickets??0}${legal>0?` (${overs}.${balls} ov)`:''}`;
  };
  const scoreByMatch=new Map<string,string>();
  for(const m of coachMatches){
    const rows=inningsRows.filter(i=>i.match_id===m.id).sort((a,b)=>a.innings_no-b.innings_no);
    if(rows.length) scoreByMatch.set(m.id,rows.map(i=>`${teamNames.get(i.batting_team_id??'')??'Unknown team'} ${scoreText(i)}`).join(' · '));
  }
  const assignedIds=[...new Set(coachMatches.map(m=>m.scorer_user_id).filter(Boolean))] as string[];
  const {data:assignedUsers}=assignedIds.length
    ? await supabase.from('jcm_users').select('user_id,full_name,email').in('user_id',assignedIds)
    : {data:[] as AssignedUser[]};
  const assignedById=new Map((assignedUsers??[]).map(u=>[u.user_id,u]));

  return <div className="shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>Coach Portal</small></div></div>
      <div style={{display:'flex',alignItems:'center',gap:10}}><MobileNav isSystemAdmin={isAdmin} isCoach={true} active="coach"/><span className="pill">COACH</span><span style={{fontSize:13,color:'var(--muted)'}}>{user.email}</span><SignOutButton/></div>
    </header>
    <div className="layout">
      <aside className="sidebar"><div className="nav-label">Coach</div><a className="nav-item active" href="/coach">My Matches</a><a className="nav-item" href="/dashboard">Dashboard</a></aside>
      <main className="main">
        <div className="banner"><h2>Coach Portal</h2><p>Prepare squads and score your school's matches.</p></div>
        <div className="eyebrow">Live scoring</div><h1>My Matches</h1><p className="subtitle">Matches involving teams from your school access.</p>
        <section className="card section">
          <div className="section-title">Matches <span className="count">{coachMatches.length}</span></div>
          {!coachMatches.length?<div className="empty">No matches available.</div>:<div className="table-wrap"><table><thead><tr>
            <th>Match</th><th>Season</th><th>Type</th><th>Age</th><th>Ruleset</th><th>Status</th><th>Score</th><th>Assigned to</th><th>Scheduled</th><th>Venue</th><th/>
          </tr></thead><tbody>
            {coachMatches.map(m=>{
              const ready=Boolean(m.toss_winner_team_id&&m.toss_decision);
              const assigned=m.scorer_user_id?assignedById.get(m.scorer_user_id):null;
              const season=m.season_name?(m.season_year?m.season_name+' '+m.season_year:m.season_name):'—';
              const type=(m.fixture_type??'—').replaceAll('_',' ');
              const competition=m.competition_name??'Competition not specified';
              return <tr key={m.id}>
                <td><strong>{m.team_a_name} vs {m.team_b_name}</strong><small>{competition}</small>{m.fixture_notes&&<small>Notes: {m.fixture_notes}</small>}{m.availability_deadline&&<small>Availability deadline: {new Date(m.availability_deadline).toLocaleString('en-ZA')}</small>}</td>
                <td>{season}</td>
                <td>{type}</td>
                <td>{m.age_group}</td>
                <td>{m.ruleset}</td>
                <td><span className="status">{m.status}</span>{m.fixture_status&&<small>Fixture: {m.fixture_status}</small>}</td>
                <td>{scoreByMatch.get(m.id)||m.current_score?<strong>{scoreByMatch.get(m.id)||m.current_score}</strong>:<span style={{color:'var(--muted)'}}>—</span>}</td>
                <td>{assigned?<><strong>{assigned.full_name||assigned.email}</strong><small>Scorer / assigned user</small></>:<span style={{color:'var(--muted)'}}>Unassigned</span>}</td>
                <td>{m.scheduled_at?new Date(m.scheduled_at).toLocaleString('en-ZA'):'—'}</td>
                <td>{m.venue_name??'Venue not specified'}</td>
                <td style={{display:'flex',gap:6,flexWrap:'wrap'}}><a className="secondary-button" href={'/operations/matches/'+m.id}>{ready?'Open preparation':'Prepare'}</a>{ready&&<a className="button" href={'/scoring/'+m.id}>Live scoring</a>}</td>
              </tr>
            })}
          </tbody></table></div>}
        </section>
      </main>
    </div>
  </div>;
}
