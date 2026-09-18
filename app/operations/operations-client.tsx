'use client';
import { useRef, useState, useTransition, type ReactNode } from 'react';
import { addCompetitionTeam, createCompetition, createFixture, publishFixture } from './actions';

type School={id:string;name:string};
type Season={id:string;school_id:string;name:string;year:number;status:string};
type Team={id:string;school_id:string;season_id:string;name:string;age_group:string;status:string};
type Competition={id:string;name:string;season_id:string|null;competition_type:string;status:string};
type Venue={id:string;name:string;school_id:string|null};
type Fixture={id:string;season_id:string|null;competition_id:string|null;home_team_id:string;away_team_id:string;scheduled_at:string;fixture_type:string;status:string;availability_deadline:string|null};

function Form({action,children,label='Save'}:{action:(fd:FormData)=>Promise<{ok:boolean;message:string}>;children:ReactNode;label?:string}) {
  const [pending,start] = useTransition();
  const [msg,setMsg] = useState('');
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} className="admin-form" onSubmit={e=>{
      e.preventDefault();
      setMsg('');
      const fd = new FormData(e.currentTarget);
      start(async()=>{
        try {
          const r = await action(fd);
          setMsg(r.message);
          if (r.ok) ref.current?.reset();
        } catch(err) {
          setMsg(err instanceof Error ? err.message : 'Unexpected error');
        }
      });
    }}>
      {children}
      <button className="button" disabled={pending}>{pending ? 'Saving…' : label}</button>
      {msg && (
        <div className={
          msg.toLowerCase().includes('required') ||
          msg.toLowerCase().includes('not authorised') ||
          msg.toLowerCase().includes('invalid') ? 'error' : 'success'
        }>{msg}</div>
      )}
    </form>
  );
}


export function OperationsClient({
  schools,seasons,teams,competitions,venues,fixtures,isSystemAdmin,isSchoolAdmin,schoolIds
}:{
  schools:School[];seasons:Season[];teams:Team[];competitions:Competition[];venues:Venue[];fixtures:Fixture[];
  isSystemAdmin:boolean;isSchoolAdmin:boolean;schoolIds:string[]
}) {
  const schoolName=(id:string)=>schools.find(x=>x.id===id)?.name??'Unknown school';
  const seasonName=(id:string|null)=>{const s=seasons.find(x=>x.id===id);return s?`${s.name} ${s.year}`:'—'};

  return <>
    <div className="admin-grid">
      {isSystemAdmin && <>
        <section className="card">
          <div className="section-title">Create competition</div>
          <p className="form-help">Competitions, leagues and inter-school structures are controlled by System Admin.</p>
          <Form action={createCompetition} label="Create competition">
            <div className="field"><label>Name</label><input name="name" placeholder="Junior Cricket League 2026" required /></div>
            <div className="field"><label>Season</label><select name="season_id" required><option value="">Select season…</option>{seasons.map(s=><option key={s.id} value={s.id}>{schoolName(s.school_id)} — {s.name} {s.year}</option>)}</select></div>
            <div className="field"><label>Type</label><select name="competition_type" defaultValue="LEAGUE"><option value="LEAGUE">League</option><option value="TOURNAMENT">Tournament</option><option value="FRIENDLY_SERIES">Friendly series</option><option value="OTHER">Other</option></select></div>
          </Form>
        </section>

        <section className="card">
          <div className="section-title">Add team to competition</div>
          <p className="form-help">Only System Admin can register school teams in competitions.</p>
          <Form action={addCompetitionTeam} label="Add team">
            <div className="field"><label>Competition</label><select name="competition_id" required><option value="">Select competition…</option>{competitions.map(c=><option key={c.id} value={c.id}>{c.name} · {seasonName(c.season_id)}</option>)}</select></div>
            <div className="field"><label>Team</label><select name="team_id" required><option value="">Select team…</option>{teams.filter(t=>t.status!=='RETIRED').map(t=><option key={t.id} value={t.id}>{t.name} · {t.age_group} · {schoolName(t.school_id)}</option>)}</select></div>
          </Form>
        </section>
      </>}

      {(isSystemAdmin || isSchoolAdmin) && <section className="card">
        <div className="section-title">{isSystemAdmin?'Create fixture':'Create school match'}</div>
        <p className="form-help">{isSystemAdmin?'Create as draft, verify the schedule, then publish.':'School Admin can create internal matches only: one of your school teams against another team from the same school. Inter-school and competition fixtures are managed by System Admin.'}</p>
        <Form action={createFixture} label={isSystemAdmin?'Create draft fixture':'Create draft school match'}>
          <div className="field"><label>Season</label><select name="season_id" required><option value="">Select season…</option>{seasons.filter(s=>isSystemAdmin||schoolIds.includes(s.school_id)).map(s=><option key={s.id} value={s.id}>{schoolName(s.school_id)} — {s.name} {s.year}</option>)}</select></div>
          <div className="field"><label>Fixture type</label><select name="fixture_type" defaultValue={isSystemAdmin?'FRIENDLY':'INTERNAL'}>{isSystemAdmin?<><option value="INTERNAL">Internal school</option><option value="INTER_SCHOOL">Inter-school</option><option value="COMPETITION">Competition</option><option value="FRIENDLY">Friendly</option><option value="TOURNAMENT">Tournament</option></>:<option value="INTERNAL">Internal school</option>}</select></div>
          <div className="field"><label>Home team</label><select name="home_team_id" required><option value="">Select home team…</option>{teams.filter(t=>t.status!=='RETIRED'&&(isSystemAdmin||schoolIds.includes(t.school_id))).map(t=><option key={t.id} value={t.id}>{t.name} · {t.age_group} · {schoolName(t.school_id)}</option>)}</select></div>
          <div className="field"><label>Away team</label><select name="away_team_id" required><option value="">Select away team…</option>{teams.filter(t=>t.status!=='RETIRED'&&(isSystemAdmin||schoolIds.includes(t.school_id))).map(t=><option key={t.id} value={t.id}>{t.name} · {t.age_group} · {schoolName(t.school_id)}</option>)}</select></div>
          {isSystemAdmin&&<div className="field"><label>Competition (optional)</label><select name="competition_id" defaultValue=""><option value="">No competition</option>{competitions.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
          <div className="field"><label>Venue</label><select name="venue_id" defaultValue=""><option value="">No venue selected</option>{venues.filter(v=>isSystemAdmin||v.school_id===null||schoolIds.includes(v.school_id)).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
          <div className="field"><label>Date & time</label><input name="scheduled_at" type="datetime-local" required /></div>
          <div className="field"><label>Availability deadline</label><input name="availability_deadline" type="datetime-local" /></div>
          <div className="field"><label>Notes</label><input name="notes" placeholder="Optional notes" /></div>
        </Form>
      </section>}
    </div>
  </>;
}
