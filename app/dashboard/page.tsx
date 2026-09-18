import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from './sign-out-button';

export const dynamic = 'force-dynamic';

type JcmRoleRow = { role: string };
type JcmSchoolLink = { school_id: string; role: string };

export default async function DashboardPage() {
  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error('JCM dashboard Supabase client error', error);
    return <main className="login-wrap"><section className="login-card"><div className="eyebrow">JCM configuration error</div><h1>Dashboard unavailable</h1><p className="subtitle">The server could not initialise the Supabase connection. Check the Cloudflare Worker environment variables.</p></section></main>;
  }

  let user;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    console.error('JCM dashboard authentication error', error);
    return <main className="login-wrap"><section className="login-card"><div className="eyebrow">JCM authentication error</div><h1>Dashboard unavailable</h1><p className="subtitle">The server could not validate the current login session. Please sign in again.</p></section></main>;
  }
  if (!user) redirect('/login');

  try {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from('jcm_users').select('full_name,email').eq('user_id', user.id).maybeSingle(),
      supabase.from('jcm_user_roles').select('role').eq('user_id', user.id).eq('active', true),
    ]);

    let schoolLinks: JcmSchoolLink[] = [];
    try {
      const { data } = await supabase
        .from('jcm_school_users')
        .select('school_id,role')
        .eq('user_id', user.id)
        .eq('active', true);
      schoolLinks = (data ?? []) as JcmSchoolLink[];
    } catch (error) {
      console.error('JCM dashboard school access lookup error', error);
    }

    const roleNames = ((roles ?? []) as JcmRoleRow[]).map((r: JcmRoleRow) => r.role);
    const links = schoolLinks;
    const schoolCount = links.length;
    const displayName = profile?.full_name || user.email || 'JCM User';
    const isSystemAdmin = roleNames.includes('SYSTEM_ADMIN');
    const isSchoolAdmin = roleNames.includes('SCHOOL_ADMIN') || links.some((x: JcmSchoolLink) => x.role === 'SCHOOL_ADMIN');
    const schoolAdminLink = links.find((x: JcmSchoolLink) => x.role === 'SCHOOL_ADMIN')?.school_id;
    const isCoach = roleNames.includes('COACH') || links.some((x: JcmSchoolLink) => x.role === 'COACH');
    const isParent = roleNames.includes('PARENT') || links.some((x: JcmSchoolLink) => x.role === 'PARENT');
    const canOperate = isSystemAdmin || links.some((x: JcmSchoolLink) => ['SCHOOL_ADMIN','COACH'].includes(x.role));

    return <div className="shell"><header className="topbar"><div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>JCM Platform</small></div></div><div style={{display:'flex',alignItems:'center',gap:14}}><span style={{fontSize:13,color:'var(--muted)'}}>{displayName}</span><SignOutButton/></div></header><div className="layout"><aside className="sidebar"><div className="nav-label">Workspace</div><a className="nav-item active" href="/dashboard">Dashboard</a>{isSystemAdmin&&<a className="nav-item" href="/admin">System Admin</a>}{isSystemAdmin&&<a className="nav-item" href="/admin/users">Users & Roles</a>}{isSchoolAdmin&&schoolAdminLink&&<a className="nav-item" href={`/school?school=${schoolAdminLink}`}>My School</a>}<div className="nav-label" style={{marginTop:14}}>Portals</div>{isCoach&&<a className="nav-item" href="/coach">Coach Portal</a>}{isParent&&<a className="nav-item" href="/parent">Parent Portal</a>}{isSchoolAdmin&&schoolAdminLink&&<a className="nav-item" href={`/school?school=${schoolAdminLink}`}>School Admin Portal</a>}<div className="nav-label" style={{marginTop:14}}>Cricket</div>{canOperate&&<a className="nav-item" href="/operations">Competitions & Fixtures</a>}{isSystemAdmin&&<a className="nav-item" href="/operations">Match Operations</a>}<a className="nav-item" href="/operations#matches">Matches</a><a className="nav-item" href="/operations#matches">Live Scoring</a><div className="nav-label" style={{marginTop:14}}>Coming next</div><span className="nav-item" style={{opacity:.55}}>Availability</span><span className="nav-item" style={{opacity:.55}}>Squads</span><span className="nav-item" style={{opacity:.55}}>Statistics</span></aside><main className="main"><div className="banner"><h2>JCM application foundation</h2><p>The new multi-school platform is connected to the JCM data architecture. Legacy production data remains separate and untouched.</p></div><div className="eyebrow">Operations dashboard</div><h1>Good day, {displayName.split(' ')[0]}</h1><p className="subtitle">Your role-aware JCM workspace is ready for the next build phase.</p><div className="grid"><div className="card"><div className="stat-label">Active roles</div><div className="stat">{roleNames.length}</div><span className="pill">{roleNames.length?roleNames.join(' · '):'Not assigned'}</span></div><div className="card"><div className="stat-label">School access</div><div className="stat">{schoolCount}</div><span className="pill">{schoolCount?'Linked':'Pending setup'}</span></div><div className="card"><div className="stat-label">Scoring engine</div><div className="stat">3</div><span className="pill">O/6 · O/7 · O/8</span></div><div className="card"><div className="stat-label">Operations</div><div className="stat">Live</div><span className="pill">Fixtures → Squads → Scoring</span></div></div><div className="section card"><div className="section-title">Build status</div><div style={{display:'grid',gap:11,fontSize:14}}><div>✓ Supabase JCM database architecture</div><div>✓ Authentication and session foundation</div><div>✓ System Admin bootstrap</div><div>✓ Schools, seasons and teams</div><div>✓ Player register and team membership</div><div>✓ Users, roles and school staff access</div><div>✓ School Admin workspace</div><div>✓ Competitions and fixtures</div><div>✓ Fixture publication and automatic availability requests</div><div>✓ Parent availability response workflow</div><div>✓ Coach / School Admin squad selection</div><div>→ Universal scoring engine and live match state</div></div></div>{!roleNames.length&&<div className="section notice"><strong>Account setup required:</strong> this authenticated account does not yet have an active JCM role. Open <a href="/admin" style={{color:'var(--sky-dark)',fontWeight:800}}>System Admin</a> to perform the one-time setup.</div>}</main></div></div>;
  } catch (error) {
    console.error('JCM dashboard data/render error', error);
    return <main className="login-wrap"><section className="login-card"><div className="eyebrow">JCM dashboard error</div><h1>Dashboard unavailable</h1><p className="subtitle">The server encountered an error loading your JCM profile or permissions. The error has been logged for diagnosis.</p></section></main>;
  }
}
