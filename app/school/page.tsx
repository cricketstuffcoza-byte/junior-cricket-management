import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '../dashboard/sign-out-button';
import { SchoolClient } from './school-client';

type StaffRow={user_id:string;full_name:string|null;email:string|null;phone:string|null;role:string;active:boolean};
type SchoolAccessRow={school_id:string;role:string};
type School={id:string;name:string;short_name:string|null;code:string};
type Team={id:string;name:string;age_group:string;status:string;season_id:string};
type Player={id:string;first_name:string;surname:string;active:boolean};

export default async function SchoolPage({searchParams}:{searchParams:Promise<{school?:string}>}){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const{data:access}=await supabase.rpc('jcm_my_school_access');
 const links=(access??[] as SchoolAccessRow[]).filter((x:SchoolAccessRow)=>x.role==='SCHOOL_ADMIN');if(!links.length)redirect('/dashboard');
 const requested=(await searchParams).school;const schoolId=links.some((x:SchoolAccessRow)=>x.school_id===requested)?requested!:links[0].school_id;
 const [{data:school,error:schoolError},{data:structure,error:structureError},{data:staff,error:staffError}]=await Promise.all([
  supabase.from('jcm_schools').select('id,name,short_name,code').eq('id',schoolId).single(),
  supabase.rpc('jcm_school_structure',{p_school_id:schoolId}),
  supabase.rpc('jcm_school_staff_directory',{p_school_id:schoolId})
 ]);
 if(schoolError||!school) return <div className="shell"><main className="main"><div className="notice">School could not be loaded: {schoolError?.message||'not found'}</div></main></div>;
 const parsed=(structure??{}) as {teams?:Team[];players?:Player[]};
 const teams=parsed.teams??[];const players=parsed.players??[];
 return <div className="shell"><header className="topbar"><div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>School Administration</small></div></div><div style={{display:'flex',alignItems:'center',gap:14}}><span className="pill">SCHOOL ADMIN</span><span style={{fontSize:13,color:'var(--muted)'}}>{user.email}</span><SignOutButton/></div></header><div className="layout"><aside className="sidebar"><div className="nav-label">My school</div><a className="nav-item active" href={`/school?school=${school.id}`}>{school.short_name||school.name}</a><a className="nav-item" href="/dashboard">Dashboard</a><div className="nav-label" style={{marginTop:14}}>Manage</div><a className="nav-item" href="#teams">Teams</a><a className="nav-item" href="#players">Players</a><a className="nav-item" href="#staff">Staff</a><div className="nav-label" style={{marginTop:14}}>Coming next</div><span className="nav-item" style={{opacity:.55}}>Fixtures</span><span className="nav-item" style={{opacity:.55}}>Availability</span><span className="nav-item" style={{opacity:.55}}>Matches</span></aside><main className="main"><div className="banner"><h2>{school.name}</h2><p>School administration workspace. Your access is restricted to this school.</p></div><div className="eyebrow">School operations</div><h1>{school.short_name||school.name}</h1><p className="subtitle">Manage staff access and view the current cricket structure.</p>{structureError&&<div className="notice">School structure warning: {structureError.message}</div>}{staffError&&<div className="notice">Staff directory warning: {staffError.message}</div>}<SchoolClient school={school as School} teams={teams} players={players} staff={(staff??[]) as StaffRow[]}/></main></div></div>;
}
