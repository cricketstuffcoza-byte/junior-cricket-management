import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '../dashboard/sign-out-button';
import { SchoolClient } from './school-client';

export default async function SchoolPage({ searchParams }: { searchParams: Promise<{ school?: string }> }) {
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect('/login');
  const {data:links}=await supabase.from('jcm_school_users').select('school_id,role').eq('user_id',user.id).eq('active',true).eq('role','SCHOOL_ADMIN');
  if(!links?.length) redirect('/dashboard');
  const requested=(await searchParams).school; const schoolId=links.some(x=>x.school_id===requested)?requested!:links[0].school_id;
  const [{data:school},{data:teams},{data:players},{data:staff,error}]=await Promise.all([
    supabase.from('jcm_schools').select('id,name,short_name,code').eq('id',schoolId).single(),
    supabase.from('jcm_teams').select('id,name,age_group,status,season_id').eq('school_id',schoolId).order('name'),
    supabase.from('jcm_players').select('id,first_name,surname,active').eq('school_id',schoolId).order('surname'),
    supabase.rpc('jcm_school_staff_directory',{p_school_id:schoolId}),
  ]);
  if(!school) redirect('/dashboard');
  return <div className="shell"><header className="topbar"><div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>School Administration</small></div></div><div style={{display:'flex',alignItems:'center',gap:14}}><span className="pill">SCHOOL ADMIN</span><span style={{fontSize:13,color:'var(--muted)'}}>{user.email}</span><SignOutButton/></div></header><div className="layout"><aside className="sidebar"><div className="nav-label">My school</div><a className="nav-item active" href={`/school?school=${school.id}`}>{school.short_name||school.name}</a><a className="nav-item" href="/dashboard">Dashboard</a><div className="nav-label" style={{marginTop:14}}>Manage</div><a className="nav-item" href="#teams">Teams</a><a className="nav-item" href="#players">Players</a><a className="nav-item" href="#staff">Staff</a><div className="nav-label" style={{marginTop:14}}>Coming next</div><span className="nav-item" style={{opacity:.55}}>Fixtures</span><span className="nav-item" style={{opacity:.55}}>Availability</span><span className="nav-item" style={{opacity:.55}}>Matches</span></aside><main className="main"><div className="banner"><h2>{school.name}</h2><p>School administration workspace. Your access is restricted to this school.</p></div><div className="eyebrow">School operations</div><h1>{school.short_name||school.name}</h1><p className="subtitle">Manage staff access and view the current cricket structure.</p>{staff&&<SchoolClient school={school} teams={teams??[]} players={players??[]} staff={staff as never[]}/>} {error&&<div className="notice" style={{marginTop:16}}>Staff directory unavailable: {error.message}</div>}</main></div></div>;
}
