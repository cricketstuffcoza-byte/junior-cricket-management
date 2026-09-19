'use client';
import {useEffect,useMemo,useState} from 'react';
type Event={sequence_number:number;innings_no:number;over_no:number;ball_no:number;event_type:string;runs:number;extras:any;dismissal_type:string|null;striker_name:string|null;non_striker_name:string|null;bowler_name:string|null;created_at:string};
type Innings={innings_no:number;batting_team_id:string;batting_team_name:string;runs:number;wickets:number;legal_balls:number;completed:boolean;target:number|null};
type Feed={match:{id:string;team_a_name:string;team_b_name:string;status:string;age_group:string;ruleset:string;scheduled_at:string|null};innings:Innings[];events:Event[]};
function overs(b:number){return Math.floor(b/8)+'.'+(b%8)}
function eventText(e:Event){const parts:string[]=[];if(e.event_type==='WICKET'||e.dismissal_type)parts.push('Wicket'+(e.dismissal_type?' — '+e.dismissal_type.replaceAll('_',' '):''));else if(e.event_type==='INNINGS_COMPLETE')parts.push('Innings complete');else if(e.event_type==='STRIKER_SWITCH')parts.push('Strike change');else if(e.event_type==='COACH_THROW')parts.push('Coach throw');else parts.push(e.event_type.replaceAll('_',' '));if(e.runs>0)parts.push(e.runs+' run'+(e.runs===1?'':'s'));return parts.join(' · ')}
export function LiveScoreClient({initialData}:{initialData:Feed}){
 const[data,setData]=useState<Feed>(initialData); const[updated,setUpdated]=useState(new Date());
 const refresh=async()=>{try{const r=await fetch('/api/live/'+data.match.id,{cache:'no-store'});if(r.ok){setData(await r.json());setUpdated(new Date())}}catch{}};
 useEffect(()=>{const t=setInterval(refresh,2500);return()=>clearInterval(t)},[data.match.id]);
 const current=data.innings.find(i=>!i.completed)||data.innings[data.innings.length-1];
 const first=data.innings.find(i=>i.innings_no===1); const chasing=current?.innings_no===2&&current.target!=null;
 const needed=chasing?Math.max(0,(current.target??0)-current.runs):0; const balls=chasing?Math.max(0,(first?.legal_balls??0)-current.legal_balls):0; const rate=balls>0?needed/balls:null;
 const grouped=useMemo(()=>data.events.slice().reverse(),[data.events]);
 return <div className="shell"><header className="topbar"><div className="brand"><div className="brand-mark">J</div><div>Junior Cricket Management<small>Live Scoring</small></div></div><div className="pill">LIVE</div></header><main className="main">
  <div className="eyebrow">{data.match.age_group} · {data.match.ruleset}</div><h1>{data.match.team_a_name} vs {data.match.team_b_name}</h1><p className="subtitle">Live ball-by-ball scoring · Updates automatically</p>
  <section className="card section"><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12}}>{data.innings.map(i=><div key={i.innings_no} className="notice"><strong>{i.batting_team_name}</strong><div style={{fontSize:28,fontWeight:900}}>{i.runs}/{i.wickets}</div><div>{overs(i.legal_balls)} overs{i.completed?' · Complete':''}</div></div>)}</div>{chasing&&<div className="notice" style={{marginTop:12,textAlign:'center',fontWeight:800}}>{needed===0?'Target reached — '+current.batting_team_name+' has enough runs to win.':current.batting_team_name+' need '+needed+' runs to win from '+balls+' balls'+(rate!==null?' · '+rate.toFixed(2)+' runs per ball required':'')}</div>}<div style={{marginTop:10,fontSize:12,color:'var(--muted)'}}>Last updated {updated.toLocaleTimeString('en-ZA')}</div></section>
  <section className="card section"><div className="section-title">Ball-by-ball</div>{grouped.length===0?<div className="empty">No scoring events yet.</div>:<div style={{display:'grid',gap:6}}>{grouped.map(e=><div key={e.sequence_number} style={{display:'grid',gridTemplateColumns:'70px 1fr auto',gap:10,padding:'9px 0',borderBottom:'1px solid var(--border)',fontSize:13}}><strong>{e.innings_no===2?'2nd':'1st'} · {e.over_no}.{e.ball_no}</strong><span>{eventText(e)}{e.striker_name?' · '+e.striker_name:''}</span><strong>{e.runs}</strong></div>)}</div>}</section>
 </main></div>
}
