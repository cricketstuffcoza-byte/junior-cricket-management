import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '../dashboard/sign-out-button';
import { SchoolClient } from './school-client';
import { ExistingUserRoleManager } from './existing-user-roles';

type StaffRow={user_id:string;full_name:string|null;email:string|null;phone:string|null;role:string;active:boolean};
type SchoolAccessRow={school_id:string;role:string};
type School={id:string;name:string;short_name:string|null;code:string};
type Team={id:string;name:string;age_group:string;status:string;season_id:string;code:string|null};
type Season={id:string;school_id:string;name:string;year:number;start_date:string|null;end_date:string|null;status:string};
type Player={id:string;first_name:string;surname:string;active:boolean;team_id:string|null;team_name:string|null;team_age_group:string|null;season_id:string|null};
type Coach={team_id:string;coach_user_id:string;primary_coach:boolean;full_name:string|null;email:string|null};

export default async function SchoolPage({searchParams}:{searchParams:Promise<{school?:string}>}){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const{data:access}=await supabase.rpc('jcm_my_school_access');
 const links=(access??[] as SchoolAccessRow[]).filter((x:SchoolAccessRow)=>x.role==='SCHOOL_ADMIN');if(!links.length)redirect('/dashboard');
 const requested=(await searchParams).school;const schoolId=links.some((x:SchoolAccessRow)=>x.school_id===requested)?requested!:links[0].school_id;
 const [{data:school,error:schoolError},{data:structure,error:structureError},{data:staff,error:staffError},{data:seasons,error:seasonsError},{data:members,error:membersError},{data:coachLinks,error:coachError}]=await Promise.all([
  supabase.from('jcm_schools').select('id,name,short_name,code').eq('id',schoolId).single(),
  supabase.rpc('jcm_school_structure',{p_school_id:schoolId}),
  supabase.rpc('jcm_school_staff_directory',{p_school_id:schoolId}),
  supabase.from('jcm_seasons').select('id,school_id,name,year,start_date,end_date,status').eq('school_id',schoolId).order('year',{ascending:false}).order('name'),
  supabase.from('jcm_team_players').select('player_id,team_id,season_id,status').eq('status','ACTIVE'),
  supabase.from('jcm_team_coaches').select('team_id,coach_user_id,primary_coach').eq('active',true)
 ]);
 if(schoolError||!school) return <div className="shell"><main className="main"><div className="notice">School could not be loaded: {schoolError?.message||'not found'}</div></main></div>;
 const parsed=(structure??{}) as {teams?:Team[];players?:Omit<Player,'team_id'|'team_name'|'team_age_group'|'season_id'>[]};
 const teams=parsed.teams??[];const basePlayers=parsed.players??[];
 const memberships=(members??[]).filter((m:any)=>teams.some(t=>t.id===m.team_id));
 const playerById=new Map(basePlayers.map(p=>[p.id,p]));const teamById=new Map(teams.map(t=>[t.id,t]));
 const players:Player[]=basePlayers.map(p=>{const m=memberships.find((x:any)=>x.player_id===p.id);const t=m?teamById.get(m.team_id):undefined;return{...p,team_id:t?.id??null,team_name:t?.name??null,team_age_group:t?.age_group??null,season_id:t?.season_id??m?.season_id??null};});
 const coachIds=[...new Set((coachLinks??[]).map((x:any)=>x.coach_user_id))];
 const {data:coachUsers}=coachIds.length?await supabase.from('jcm_users').select('user_id,full_name,email').in('user_id',coachIds):{data:[]};
 const coachUserById=new Map((coachUsers??[]).map((x:any)=>[x.user_id,x]));
 const coaches:Coach[]=(coachLinks??[]).filter((x:any)=>teams.some(t=>t.id===x.team_id)).map((x:any)=>{const u=coachUserById.get(x.coach_user_id);return{...x,full_name:u?.full_name??null,email:u?.email??null};});
 const warnings=[structureError&&`School structure: ${structureError.message}`,staffError&&`Staff directory: ${staffError.message}`,seasonsError&&`Seasons: ${seasonsError.message}`,membersError&&`Player memberships: ${membersError.message}`,coachError&&`Team coaches: ${coachError.message}`].filter(Boolean) as string[];
 return <div className="shell"><header className="topbar"><div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>School Administration</small></div></div><div style={{display:'flex',alignItems:'center',gap:14}}><span className="pill">SCHOOL ADMIN</span><span style={{fontSize:13,color:'var(--muted)'}}>{user.email}</span><SignOutButton/></div></header><div className="layout"><aside className="sidebar"><div className="nav-label">My school</div><a className="nav-item active" href={`/school?school=${school.id}`}>{school.short_name||school.name}</a><a className="nav-item" href="/dashboard">Dashboard</a><div className="nav-label" style={{marginTop:14}}>Manage</div><a className="nav-item" href="#seasons">Seasons</a><a className="nav-item" href="#teams">Teams</a><a className="nav-item" href="#players">Players</a><a className="nav-item" href="#staff">Staff</a><a className="nav-item" href="#existing-user-roles">Existing user roles</a><div className="nav-label" style={{marginTop:14}}>Coming next</div><span className="nav-item" style={{opacity:.55}}>Fixtures</span><span className="nav-item" style={{opacity:.55}}>Availability</span><span className="nav-item" style={{opacity:.55}}>Matches</span></aside><main className="main"><div className="banner"><h2>{school.name}</h2><p>School administration workspace. Your access is restricted to this school.</p></div><div className="eyebrow">School operations</div><h1>{school.short_name||school.name}</h1><p className="subtitle">Manage seasons, teams, coaches, players and school staff.</p>{warnings.map(w=><div className="notice" key={w}>{w}</div>)}<SchoolClient school={school as School} seasons={(seasons??[]) as Season[]} teams={teams} players={players} staff={(staff??[]) as StaffRow[]} coaches={coaches}/><ExistingUserRoleManager schoolId={school.id}/></main></div></div>;
}
