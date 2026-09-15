import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '../dashboard/sign-out-button';
import { OperationsClient } from './operations-client';

export default async function OperationsPage(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect('/login');
 const {data:roles}=await supabase.from('jcm_user_roles').select('role').eq('user_id',user.id).eq('active',true);
 const isAdmin=(roles??[]).some(r=>r.role==='SYSTEM_ADMIN');
 const {data:links}=await supabase.from('jcm_school_users').select('school_id,role').eq('user_id',user.id).eq('active',true);
 if(!isAdmin && !(links??[]).some(x=>['SCHOOL_ADMIN','COACH'].includes(x.role))) redirect('/dashboard');
 const [{data:schools},{data:seasons},{data:teams},{data:competitions},{data:venues},{data:fixtures}]=await Promise.all([
  supabase.from('jcm_schools').select('id,name').order('name'),
  supabase.from('jcm_seasons').select('id,school_id,name,year,status').order('year',{ascending:false}),
  supabase.from('jcm_teams').select('id,school_id,season_id,name,age_group,status').order('name'),
  supabase.from('jcm_competitions').select('id,name,season_id,competition_type,status').order('name'),
  supabase.from('jcm_venues').select('id,name,school_id').eq('active',true).order('name'),
  supabase.from('jcm_fixtures').select('id,season_id,competition_id,home_team_id,away_team_id,scheduled_at,fixture_type,status,availability_deadline').order('scheduled_at',{ascending:false}),
 ]);
 return <div className="shell"><header className="topbar"><div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>Cricket Operations</small></div></div><div style={{display:'flex',alignItems:'center',gap:14}}><span className="pill">{isAdmin?'SYSTEM ADMIN':'SCHOOL OPERATIONS'}</span><span style={{fontSize:13,color:'var(--muted)'}}>{user.email}</span><SignOutButton/></div></header><div className="layout"><aside className="sidebar"><div className="nav-label">Operations</div><a className="nav-item active" href="/operations">Competitions & Fixtures</a><a className="nav-item" href="/dashboard">Dashboard</a><div className="nav-label" style={{marginTop:14}}>Match flow</div><span className="nav-item" style={{opacity:.55}}>Availability</span><span className="nav-item" style={{opacity:.55}}>Squads</span><span className="nav-item" style={{opacity:.55}}>Live Scoring</span></aside><main className="main"><div className="banner"><h2>Cricket Operations</h2><p>Build the fixture pipeline from competition and schedule through availability and squad selection.</p></div><div className="eyebrow">Competition & fixture management</div><h1>Schedule the cricket</h1><p className="subtitle">Competitions, fixtures and the availability workflow now share one JCM operational layer.</p><OperationsClient schools={schools??[]} seasons={seasons??[]} teams={teams??[]} competitions={competitions??[]} venues={venues??[]} fixtures={fixtures??[]}/></main></div></div>
}
