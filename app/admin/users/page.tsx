import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '../../dashboard/sign-out-button';
import { UsersClient } from './users-client';

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: role } = await supabase.from('jcm_user_roles').select('role').eq('user_id', user.id).eq('role','SYSTEM_ADMIN').eq('active',true).maybeSingle();
  if (!role) redirect('/admin');

  const [{ data: schools }, { data: users, error }] = await Promise.all([
    supabase.from('jcm_schools').select('id,name').eq('active',true).order('name'),
    supabase.rpc('jcm_system_admin_users'),
  ]);

  return <div className="shell"><header className="topbar"><div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>System Administration</small></div></div><div style={{display:'flex',alignItems:'center',gap:14}}><span className="pill">SYSTEM ADMIN</span><span style={{fontSize:13,color:'var(--muted)'}}>{user.email}</span><SignOutButton/></div></header>
    <div className="layout"><aside className="sidebar"><div className="nav-label">System</div><a className="nav-item" href="/admin">System Admin</a><a className="nav-item active" href="/admin/users">Users & Roles</a><a className="nav-item" href="/dashboard">Dashboard</a><div className="nav-label" style={{marginTop:14}}>Configuration</div><a className="nav-item" href="/admin#schools">Schools</a><a className="nav-item" href="/admin#seasons">Seasons</a><a className="nav-item" href="/admin#teams">Teams</a></aside>
      <main className="main"><div className="eyebrow">System administration</div><h1>Users & roles</h1><p className="subtitle">Control who can access JCM and which school-level responsibilities they have.</p>{error ? <div className="notice"><strong>Could not load users.</strong> {error.message}</div> : <UsersClient schools={schools ?? []} users={(users ?? []) as never[]}/>}</main>
    </div></div>;
}
