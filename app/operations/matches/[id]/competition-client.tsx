'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { assignMatchCompetition } from '../../actions';

type Competition = { id:string; name:string; season_id:string|null; competition_type:string; status:string };

export function MatchCompetitionClient({matchId, currentCompetitionId, competitions}:{matchId:string;currentCompetitionId:string|null;competitions:Competition[]}){
 const router=useRouter();
 const [value,setValue]=useState(currentCompetitionId??'');
 const [pending,start]=useTransition();
 const [msg,setMsg]=useState('');
 return <section className="card section">
  <div className="section-title">Competition / League</div>
  <p className="form-help">Assign this existing match to a competition. This updates both the match and its linked fixture.</p>
  <div className="field">
   <label>Competition</label>
   <select value={value} onChange={e=>setValue(e.target.value)}>
    <option value="">No competition</option>
    {competitions.filter(c=>c.status!=='ARCHIVED').map(c=><option key={c.id} value={c.id}>{c.name} · {c.competition_type.replaceAll('_',' ')}</option>)}
   </select>
  </div>
  <button className="button" disabled={pending} onClick={()=>start(async()=>{
   setMsg('');
   const fd=new FormData();
   fd.set('match_id',matchId);
   fd.set('competition_id',value);
   const r=await assignMatchCompetition(fd);
   setMsg(r.message);
   if(r.ok) router.refresh();
  })}>{pending?'Saving…':'Save competition'}</button>
  {msg&&<div className={msg.toLowerCase().includes('error')||msg.toLowerCase().includes('required')||msg.toLowerCase().includes('not authorised')?'error':'success'}>{msg}</div>}
 </section>
}