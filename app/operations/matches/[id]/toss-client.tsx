'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveToss } from '../actions';

type Team={id:string;name:string;age_group:string};
type Match={id:string;team_a_id:string;team_b_id:string;toss_winner_team_id:string|null;toss_decision:string|null};
type Counts={home:number;away:number};

export function TossClient({match,home,away,squadCounts}:{match:Match;home:Team|null;away:Team|null;squadCounts:Counts}){
 const router=useRouter();
 const[pending,start]=useTransition();
 const[msg,setMsg]=useState('');
 const[winner,setWinner]=useState(match.toss_winner_team_id??'');
 const[decision,setDecision]=useState(match.toss_decision??'');
 const valid=squadCounts.home>=6&&squadCounts.home<=14&&squadCounts.away>=6&&squadCounts.away<=14;
 const tossComplete=Boolean(match.toss_winner_team_id&&match.toss_decision);
 return <section className="card section">
  <div className="section-title">Toss</div>
  <p className="form-help">Both teams must have 6–14 selected players before the toss can be recorded. Current squads: {squadCounts.home} and {squadCounts.away}.</p>
  <div className="field"><label>Toss winner</label><select value={winner} onChange={e=>setWinner(e.target.value)}><option value="">Select team…</option>{home&&<option value={home.id}>{home.name}</option>}{away&&<option value={away.id}>{away.name}</option>}</select></div>
  <div className="field"><label>Decision</label><select value={decision} onChange={e=>setDecision(e.target.value)}><option value="">Select decision…</option><option value="BAT">Bat</option><option value="BOWL">Bowl</option></select></div>
  <button className="button" disabled={pending||!winner||!decision||!valid} onClick={()=>start(async()=>{
   const fd=new FormData();
   fd.set('match_id',match.id); fd.set('toss_winner_team_id',winner); fd.set('toss_decision',decision);
   const r=await saveToss(fd);
   setMsg(r.message);
   if(r.ok){ router.refresh(); }
  })}>{pending?'Saving…':tossComplete?'Update toss':'Save toss'}</button>
  {!valid&&<div className="form-help" style={{marginTop:10}}>Select between 6 and 14 players for each team before continuing.</div>}
  {msg&&<div className="success">{msg}</div>}
 </section>
}
