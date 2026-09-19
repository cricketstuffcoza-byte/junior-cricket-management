import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {SignOutButton} from '../../../dashboard/sign-out-button';
import {TossClient} from './toss-client';
import {MatchSquadClient} from './match-squad-client';
import {MatchCompetitionClient} from './competition-client';

export const dynamic='force-dynamic';

export default async function MatchPreparation({params}:{params:Promise<{id:string}>}){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const id=(await params).id;

 const {data:prep,error:prepError}=await supabase.rpc('jcm_get_match_preparation',{p_match_id:id});
 if(prepError||!prep?.match)redirect('/operations');

 const m=prep.match as {
  id:string;fixture_id:string|null;team_a_id:string;team_b_id:string;age_group:string;ruleset:string;
  scheduled_at:string|null;status:string;toss_winner_team_id:string|null;toss_decision:string|null;competition_id:string|null
 };
 const a=prep.home as {id:string;name:string;age_group:string}|null;
 const b=prep.away as {id:string;name:string;age_group:string}|null;
 if(!a||!b)redirect('/operations');

 const matchPlayers=(prep.selections??[]) as {player_id:string;team_id:string;selected:boolean}[];
 const [{data:competitions},{data:homePlayers},{data:awayPlayers},{data:availability}]=await Promise.all([
  supabase.from('jcm_competitions').select('id,name,season_id,competition_type,status').order('name'),
  supabase.from('jcm_team_players').select('player_id,team_id,status,jcm_players(id,first_name,surname)').eq('team_id',m.team_a_id).eq('status','ACTIVE'),
  supabase.from('jcm_team_players').select('player_id,team_id,status,jcm_players(id,first_name,surname)').eq('team_id',m.team_b_id).eq('status','ACTIVE'),
  m.fixture_id?supabase.from('jcm_fixture_availability').select('player_id,status,note').eq('fixture_id',m.fixture_id):Promise.resolve({data:[]})
 ]);

 const tossComplete=Boolean(m.toss_winner_team_id&&m.toss_decision);
 const homeCount=matchPlayers.filter(p=>p.team_id===m.team_a_id&&p.selected).length;
 const awayCount=matchPlayers.filter(p=>p.team_id===m.team_b_id&&p.selected).length;

 return <div className="shell">
  <header className="topbar"><div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>Match Preparation</small></div></div><div style={{display:'flex',alignItems:'center',gap:14}}><span className="pill">{m.ruleset}</span><span style={{fontSize:13,color:'var(--muted)'}}>{user.email}</span><SignOutButton/></div></header>
  <main className="main">
   <a href="/operations" style={{color:'var(--sky-dark)',fontWeight:800,fontSize:13}}>← Back to operations</a>
   <div className="banner" style={{marginTop:18}}><h2>{a.name} vs {b.name}</h2><p>{new Date(m.scheduled_at??Date.now()).toLocaleString('en-ZA')} · {m.age_group} · Ruleset {m.ruleset}</p></div>
   <div className="eyebrow">Match setup</div><h1>Prepare the match</h1>
   <p className="subtitle">The scorer or coach selects the actual playing squad for both teams. Parent availability is shown as guidance only.</p>
   <div className="grid">
    <div className="card"><div className="stat-label">Home team</div><div className="stat" style={{fontSize:22}}>{a.name}</div><span className="pill">{homeCount} selected</span></div>
    <div className="card"><div className="stat-label">Away team</div><div className="stat" style={{fontSize:22}}>{b.name}</div><span className="pill">{awayCount} selected</span></div>
    <div className="card"><div className="stat-label">Ruleset</div><div className="stat">{m.ruleset}</div><span className="pill">{m.age_group}</span></div>
    <div className="card"><div className="stat-label">Status</div><div className="stat" style={{fontSize:22}}>{m.status}</div><span className="pill">{tossComplete?'Toss complete':'Toss required'}</span></div>
   </div>
   <MatchCompetitionClient matchId={m.id} currentCompetitionId={m.competition_id} competitions={competitions??[]}/>
   <MatchSquadClient matchId={m.id} home={a} away={b} homePlayers={homePlayers??[]} awayPlayers={awayPlayers??[]} availability={availability??[]} selections={matchPlayers}/>
   <TossClient match={m} home={a} away={b} squadCounts={{home:homeCount,away:awayCount}}/>
   {tossComplete&&<section className="card section"><div className="section-title">Scoring</div><p className="form-help">The toss is recorded and the match is now live. Open live scoring to choose the opening players and start the innings.</p><a className="button" style={{display:'block',textAlign:'center'}} href={'/scoring/'+id}>Go to live scoring</a></section>}
  </main>
 </div>
}