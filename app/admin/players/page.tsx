import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '../../dashboard/sign-out-button';
import { PlayerClient } from './player-client';

export default async function PlayersAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: role } = await supabase.from('jcm_user_roles').select('role').eq('user_id', user.id).eq('role', 'SYSTEM_ADMIN').eq('active', true).maybeSingle();
  if (!role) redirect('/admin');
  const [{ data: schools }, { data: players }, { data: teams }, { data: memberships }] = await Promise.all([
    supabase.from('jcm_schools').select('id,name').order('name'),
    supabase.from('jcm_players').select('id,school_id,first_name,surname,date_of_birth,gender,active').order('surname').order('first_name'),
    supabase.from('jcm_teams').select('id,school_id,season_id,name,age_group,status').order('name'),
    supabase.from('jcm_team_players').select('player_id,team_id,season_id'),
  ]);
  return <div className="shell"><header className="topbar"><div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>Player Administration</small></div></div><div style={{ display:'flex',alignItems:'center',gap:14 }}><span className="pill">SYSTEM ADMIN</span><SignOutButton /></div></header><div className="layout"><aside className="sidebar"><div className="nav-label">System</div><a className="nav-item" href="/dashboard">Dashboard</a><a className="nav-item" href="/admin">System Admin</a><div className="nav-label" style={{marginTop:14}}>Configuration</div><a className="nav-item active" href="/admin/players">Players</a><a className="nav-item" href="/admin#teams">Teams</a></aside><main className="main"><div className="eyebrow">Player administration</div><h1>Players & rosters</h1><p className="subtitle">Create persistent player records and assign them to season-specific teams without overwriting history.</p><PlayerClient schools={schools ?? []} players={players ?? []} teams={teams ?? []} memberships={memberships ?? []} /></main></div></div>;
}
