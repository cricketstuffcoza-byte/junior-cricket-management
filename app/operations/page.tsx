import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '../dashboard/sign-out-button';
import { OperationsClient } from './operations-client';
import { MatchScorerAssignment } from '../components/match-scorer-assignment';

export const dynamic = 'force-dynamic';

type MatchRow = { id:string; fixture_id:string|null; team_a_id:string; team_a_name:string; team_b_id:string; team_b_name:string; age_group:string; ruleset:string; venue_id:string|null; competition_id:string|null; status:string; scheduled_at:string|null; toss_winner_team_id:string|null; toss_decision:string|null; result_winner_team_id:string|null; result_reason:string|null; result_margin:string|null; scorer_user_id:string|null; fixture_competition_id:string|null; fixture_venue_id:string|null; fixture_notes:string|null };
type FixtureRow = { id:string; competition_id:string|null; venue_id:string|null; notes:string|null };
type InningsRow = { id:string; match_id:string; innings_no:number; batting_team_id:string|null; runs:number; wickets:number; legal_balls:number; completed:boolean };

export default async function OperationsPage() {
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data:roles } = await supabase.from('jcm_user_roles').select('role').eq('user_id',user.id).eq('active',true);
  const isAdmin = (roles ?? []).some(r=>r.role==='SYSTEM_ADMIN');
  const { data:links } = await supabase.from('jcm_school_users').select('school_id,role').eq('user_id',user.id).eq('active',true);
  const isSchoolAdmin = (links ?? []).some(x=>x.role==='SCHOOL_ADMIN');
  const schoolIds = [...new Set((links ?? []).map(x=>x.school_id))];
  if (!isAdmin && !(links ?? []).some(x=>['SCHOOL_ADMIN','COACH'].includes(x.role))) redirect('/dashboard');

  const [{data:schools},{data:seasons},{data:teams},{data:competitions},{data:venues},{data:fixtures},{data:innings}] = await Promise.all([
    supabase.from('jcm_schools').select('id,name').order('name'),
    supabase.from('jcm_seasons').select('id,school_id,name,year,status').order('year',{ascending:false}),
    supabase.from('jcm_teams').select('id,school_id,season_id,name,age_group,status').order('name'),
    supabase.from('jcm_competitions').select('id,name,season_id,competition_type,status').order('name'),
    supabase.from('jcm_venues').select('id,name,school_id').eq('active',true).order('name'),
    supabase.from('jcm_fixtures').select('id,season_id,competition_id,venue_id,home_team_id,away_team_id,scheduled_at,fixture_type,status,availability_deadline,notes').order('scheduled_at',{ascending:false}),
     supabase.from('jcm_innings').select('match_id,innings_no,batting_team_id,runs,wickets,legal_balls,completed').order('innings_no')
  ]);

  const { data:matches,error:matchesError } = await supabase.rpc('jcm_operations_match_feed');
  if (matchesError) throw new Error(matchesError.message);

  const rawMatches: MatchRow[] = (matches ?? []).map((row: any) => ({
    ...row,
    team_a_name: row.team_a_name ?? 'Unknown team',
    team_b_name: row.team_b_name ?? 'Unknown team',
  }));
  const assignedUserIds = [...new Set(rawMatches.map(m=>m.scorer_user_id).filter(Boolean))] as string[];
  const { data:assignedUsers } = assignedUserIds.length
    ? await supabase.from('jcm_users').select('user_id,full_name,email').in('user_id',assignedUserIds)
    : { data: [] };

  let assignableUsers: {user_id:string;full_name:string|null;email:string|null}[] = [];
  if (isAdmin) {
    const { data:roleUsers } = await supabase.from('jcm_user_roles').select('user_id').in('role',['COACH','SCORER']).eq('active',true);
    const ids = [...new Set((roleUsers??[]).map(x=>x.user_id))];
    if (ids.length) {
      const { data:users } = await supabase.from('jcm_users').select('user_id,full_name,email').in('user_id',ids);
      assignableUsers = (users??[]) as typeof assignableUsers;
    }
  } else if (schoolIds.length) {
    const { data:schoolUsers } = await supabase.from('jcm_school_users').select('user_id').in('school_id',schoolIds).in('role',['COACH','SCORER']).eq('active',true);
    const ids = [...new Set((schoolUsers??[]).map(x=>x.user_id))];
    if (ids.length) {
      const { data:users } = await supabase.from('jcm_users').select('user_id,full_name,email').in('user_id',ids);
      assignableUsers = (users??[]) as typeof assignableUsers;
    }
  }
  const assignmentUsers = new Map<string,{user_id:string;full_name:string|null;email:string|null}>();
  for (const u of [...(assignedUsers??[]), ...assignableUsers]) assignmentUsers.set(u.user_id,u);
  const assignmentUserList = [...assignmentUsers.values()];
  const visibleTeamIds = new Set((teams ?? []).filter(t=>isAdmin||schoolIds.includes(t.school_id)).map(t=>t.id));
  const visibleTeams = (teams ?? []).filter(t=>isAdmin||schoolIds.includes(t.school_id));
  const visibleSeasons = (seasons ?? []).filter(s=>isAdmin||schoolIds.includes(s.school_id));
  const visibleVenues = (venues ?? []).filter(v=>isAdmin||v.school_id===null||schoolIds.includes(v.school_id));
  const visibleFixtures = (fixtures ?? []).filter(f=>isAdmin||visibleTeamIds.has(f.home_team_id)||visibleTeamIds.has(f.away_team_id));
  const matchRows=rawMatches;
  const fixtureRows=(visibleFixtures??[]) as FixtureRow[];
  const inningsRows=(innings??[]) as InningsRow[];
  const teamName=(id:string|null)=>id ? teams?.find(t=>t.id===id)?.name ?? 'Unknown team' : 'Unknown team';
  const competitionName=(id:string|null)=>competitions?.find(c=>c.id===id)?.name ?? null;
  const venueName=(id:string|null)=>venues?.find(v=>v.id===id)?.name ?? null;
  const scoreText=(i:InningsRow)=>{
    const ballsPerOver=8;
    const legal=i.legal_balls??0;
    const overs=Math.floor(legal/ballsPerOver);
    const balls=legal%ballsPerOver;
    return i.runs+'/'+i.wickets+(legal>0 ? ' ('+overs+'.'+balls+' ov)' : '');
  };
  const scoreForMatch=(m:MatchRow)=>{
    const rows=inningsRows.filter(i=>i.match_id===m.id).sort((a,b)=>a.innings_no-b.innings_no);
    if(!rows.length) return null;
    const scores=rows.map(i=>teamName(i.batting_team_id)+' '+scoreText(i));
    if(m.status==='LIVE'||m.status==='PAUSED'){
      const current=[...rows].reverse().find(i=>!i.completed) ?? rows[rows.length-1];
      const previous=rows.filter(i=>i.id!==current.id);
      const currentText=current?.batting_team_id ? teamName(current.batting_team_id)+' '+scoreText(current) : '0/0';
      return previous.length ? previous.map(i=>teamName(i.batting_team_id)+' '+scoreText(i)).join(' · ')+' · '+currentText : currentText;
    }
    if(m.status==='COMPLETED'||m.status==='FINALISED') return scores.join(' · ');
    return scores.join(' · ');
  };

  return <div className="shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>Cricket Operations</small></div></div><div style={{display:'flex',alignItems:'center',gap:14}}><span className="pill">{isAdmin?'SYSTEM ADMIN':'SCHOOL OPERATIONS'}</span><span style={{fontSize:13,color:'var(--muted)'}}>{user.email}</span><SignOutButton/></div></header>
    <div className="layout"><aside className="sidebar"><div className="nav-label">Operations</div><a className="nav-item active" href="/operations">Competitions & Fixtures</a><a className="nav-item" href="/dashboard">Dashboard</a><div className="nav-label" style={{marginTop:14}}>Match flow</div><a className="nav-item" href="#matches">Matches</a><a className="nav-item" href="#matches">Live Scoring</a></aside>
      <main className="main"><div className="banner"><h2>Cricket Operations</h2><p>Build the fixture pipeline from competition and schedule through availability and squad selection.</p></div><div className="eyebrow">Competition & fixture management</div><h1>Schedule the cricket</h1><p className="subtitle">Competitions, fixtures and the availability workflow now share one JCM operational layer.</p>
        <OperationsClient schools={schools??[]} seasons={visibleSeasons} teams={visibleTeams} competitions={competitions??[]} venues={visibleVenues} fixtures={visibleFixtures} isSystemAdmin={isAdmin} isSchoolAdmin={isSchoolAdmin} schoolIds={schoolIds}/>
        <section id="matches" className="card section"><div className="section-title">Matches <span className="count">{matchRows.length}</span></div>
          {matchRows.length===0 ? <div className="empty">No matches prepared yet.</div> : <div className="table-wrap"><table><thead><tr><th>Match</th><th>Age</th><th>Ruleset</th><th>Status</th><th>Score</th><th>Assigned to</th><th>Scheduled</th><th/></tr></thead><tbody>
            {matchRows.map(m=>{
              const ready=Boolean(m.toss_winner_team_id&&m.toss_decision);
              const fixture=fixtureRows.find(f=>f.id===m.fixture_id);
              const competition=competitionName(m.competition_id)??competitionName(fixture?.competition_id??null);
              const league=competition??fixture?.notes??'Competition not specified';
              const venue=venueName(m.venue_id)??venueName(fixture?.venue_id??null)??'Venue not specified';
              const matchLabel=m.result_reason ? 'Result: '+m.result_reason+(m.result_margin!=null?' · '+m.result_margin:'') : 'Match preparation';
              const score=scoreForMatch(m);
              return <tr key={m.id}><td><strong>{m.team_a_name} vs {m.team_b_name}</strong><small>{league}</small><small>📍 {venue}</small><small>{matchLabel}</small></td><td>{m.age_group}</td><td>{m.ruleset}</td><td><span className="status">{m.status}</span></td><td>{score ? <strong>{score}</strong> : <span style={{color:'var(--muted)'}}>—</span>}</td><td><MatchScorerAssignment matchId={m.id} currentUserId={m.scorer_user_id} users={assignmentUserList} compact /></td><td>{m.scheduled_at?new Date(m.scheduled_at).toLocaleString('en-ZA'):'—'}</td><td style={{display:'flex',gap:6,flexWrap:'wrap'}}><a className="secondary-button" href={'/operations/matches/'+m.id}>{ready?'Open preparation':'Prepare'}</a>{ready&&<a className="button" href={'/scoring/'+m.id}>Live scoring</a>}</td></tr>;
            })}
          </tbody></table></div>}
        </section>
      </main>
    </div>
  </div>;
}
