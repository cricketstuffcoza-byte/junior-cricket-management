import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {SignOutButton} from '../../../dashboard/sign-out-button';
import {TossClient} from './toss-client';
import {MatchSquadClient} from './match-squad-client';

export default async function MatchPreparation({params}:{params:Promise<{id:string}>}){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const id=(await params).id;
 const [{data:m},{data:teams},{data:matchPlayers}]=await Promise.all([
  supabase.from('jcm_matches').select('id,fixture_id,team_a_id,team_b_id,age_group,ruleset,scheduled_at,status,toss_winner_team_id,toss_decision').eq('id',id).single(),
  supabase.from('jcm_teams').select('id,name,age_group').order('name'),
  supabase.from('jcm_match_players').select('player_id,team_id,selected').eq('match_id',id)
 ]);
 if(!m)redirect('/operations');
 const a=teams?.find(t=>t.id===m.team_a_id);
 const b=teams?.find(t=>t.id===m.team_b_id);
 const [{data:homePlayers},{data:awayPlayers},{data:availability}]=await Promise.all([
  supabase.from('jcm_team_players').select('player_id,team_id,status,jcm_players(id,first_name,surname)').eq('team_id',m.team_a_id).eq('status','ACTIVE'),
  supabase.from('jcm_team_players').select('player_id,team_id,status,jcm_players(id,first_name,surname)').eq('team_id',m.team_b_id).eq('status','ACTIVE'),
  m.fixture_id?supabase.from('jcm_fixture_availability').select('player_id,status,note').eq('fixture_id',m.fixture_id):Promise.resolve({data:[]})
 ]);
 const tossComplete=Boolean(m.toss_winner_team_id&&m.toss_decision);
 const homeCount=matchPlayers?.filter(p=>p.team_id===m.team_a_id&&p.selected).length??0;
 const awayCount=matchPlayers?.filter(p=>p.team_id===m.team_b_id&&p.selected).length??0;
 return <div className="shell"><header className="topbar"><div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>Match Preparation</small></div></div><div style={{display:'flex',alignItems:'center',gap:14}}><span className="pill">{m.ruleset}</span><span style={{fontSize:13,color:'var(--muted)'}}>{user.email}</span><SignOutButton/></div></header><main className="main"><a href="/operations" style={{color:'var(--sky-dark)',fontWeight:800,fontSize:13}}>← Back to operations</a><div className="banner" style={{marginTop:18}}><h2>{a?.name} vs {b?.name}</h2><p>{new Date(m.scheduled_at??Date.now()).toLocaleString('en-ZA')} · {m.age_group} · Ruleset {m.ruleset}</p></div><div className="eyebrow">Match setup</div><h1>Prepare the match</h1><p className="subtitle">The scorer or coach selects the actual playing squad for both teams. Parent availability is shown as guidance only.</p><div className="grid"><div className="card"><div className="stat-label">Home team</div><div className="stat" style={{fontSize:22}}>{a?.name}</div><span className="pill">{homeCount} selected</span></div><div className="card"><div className="stat-label">Away team</div><div className="stat" style={{fontSize:22}}>{b?.name}</div><span className="pill">{awayCount} selected</span></div><div className="card"><div className="stat-label">Ruleset</div><div className="stat">{m.ruleset}</div><span className="pill">{m.age_group}</span></div><div className="card"><div className="stat-label">Status</div><div className="stat" style={{fontSize:22}}>{m.status}</div><span className="pill">{tossComplete?'Toss complete':'Toss required'}</span></div></div>{a&&b&&<MatchSquadClient matchId={m.id} home={a} away={b} homePlayers={homePlayers??[]} awayPlayers={awayPlayers??[]} availability={availability??[]} selections={matchPlayers??[]}/>}<TossClient match={m} home={a??null} away={b??null} squadCounts={{home:homeCount,away:awayCount}}/>{tossComplete&&<section className="card section"><div className="section-title">Scoring</div><p className="form-help">The toss is recorded and the match is now live. Open live scoring to choose the opening players and start the innings.</p><a className="button" style={{display:'block',textAlign:'center'}} href={`/scoring/${id}`}>Go to live scoring</a></section>}</main></div>
}