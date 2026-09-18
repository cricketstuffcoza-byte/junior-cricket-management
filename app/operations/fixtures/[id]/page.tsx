import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '../../../dashboard/sign-out-button';
import { SquadClient } from './squad-client';

export default async function SquadPage({params}:{params:Promise<{id:string}>}){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');const id=(await params).id;
 const [{data:fixture},{data:teams},{data:availability},{data:selections}]=await Promise.all([
  supabase.from('jcm_fixtures').select('id,season_id,competition_id,home_team_id,away_team_id,scheduled_at,fixture_type,status,availability_deadline').eq('id',id).single(),
  supabase.from('jcm_teams').select('id,name,age_group,school_id').order('name'),
  supabase.from('jcm_fixture_availability').select('fixture_id,player_id,status,note,responded_at').eq('fixture_id',id),
  supabase.from('jcm_squad_selections').select('fixture_id,team_id,player_id,selected').eq('fixture_id',id),
 ]);
 if(!fixture)redirect('/operations');
 const [{data:homePlayers},{data:awayPlayers}]=await Promise.all([
  supabase.from('jcm_team_players').select('player_id,team_id,status,jcm_players(id,first_name,surname)').eq('team_id',fixture.home_team_id).eq('status','ACTIVE'),
  supabase.from('jcm_team_players').select('player_id,team_id,status,jcm_players(id,first_name,surname)').eq('team_id',fixture.away_team_id).eq('status','ACTIVE'),
 ]);
 const home=teams?.find(t=>t.id===fixture.home_team_id);const away=teams?.find(t=>t.id===fixture.away_team_id);
 return <div className="shell"><header className="topbar"><div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>Squad Selection</small></div></div><div style={{display:'flex',alignItems:'center',gap:14}}><span className="pill">MATCH PREPARATION</span><span style={{fontSize:13,color:'var(--muted)'}}>{user.email}</span><SignOutButton/></div></header><main className="main"><a href="/operations" style={{color:'var(--sky-dark)',fontWeight:800,fontSize:13}}>← Back to operations</a><div className="banner" style={{marginTop:18}}><h2>{home?.name??'Home'} vs {away?.name??'Away'}</h2><p>{new Date(fixture.scheduled_at).toLocaleString('en-ZA')} · {fixture.fixture_type.replaceAll('_',' ')} · {fixture.status}</p></div><div className="eyebrow">Availability & squad selection</div><h1>Build the squads</h1><p className="subtitle">Availability is parent-owned information. Coaches and School Admins decide selection separately.</p><SquadClient fixture={fixture} home={home??null} away={away??null} homePlayers={homePlayers??[]} awayPlayers={awayPlayers??[]} availability={availability??[]} selections={selections??[]}/></main></div>
}
