import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="login-wrap">
      <section className="login-card" style={{ textAlign: 'center' }}>
        <div className="brand" style={{ justifyContent: 'center' }}><div className="brand-mark">J</div><div>Junior Cricket Management<small>JCM Platform</small></div></div>
        <div style={{ marginTop: 34 }}><div className="eyebrow">Multi-school cricket platform</div><h1>Manage junior cricket. Properly.</h1><p className="subtitle">Schools, teams, players, fixtures, availability, live scoring, statistics and results in one platform.</p></div>
        <Link className="button" style={{ display: 'block' }} href="/login">Sign in to JCM</Link>
      </section>
    </main>
  );
}
