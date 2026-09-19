'use client';
import {useState,useTransition} from 'react';
import {setMatchPlayerSelection} from '../actions';

type Player={player_id:string;team_id:string;status:string;jcm_players:{id:string;first_name:string;surname:string}|{id:string;first_name:string;surname:string}[]|null};
type Availability={player_id:string;status:string;note:string|null};
type Selected={player_id:string;team_id:string;selected:boolean};
type Team={id:string;name:string};

function playerName(p:Player){const x=Array.isArray(p.jcm_players)?p.jcm_players[0]:p.jcm_players;return x?`${x.first_name} ${x.surname}`:'Unknown player'}

function TeamSquad({matchId,team,players,availability,selections,onCountChange}:{matchId:string;team:Team;players:Player[];availability:Availability[];selections:Selected[];onCountChange:(count:number)=>void}){
 const[pending,start]=useTransition();
 const[msg,setMsg]=useState('');
 const count=selections.filter(s=>s.team_id===team.id&&s.selected).length;
 const selected=(id:string)=>selections.find(s=>s.team_id===team.id&&s.player_id===id)?.selected??false;
 const availabilityFor=(id:string)=>availability.find(a=>a.player_id===id);
 return <section className="card">
  <div className="section-title">{team.name} <span className="count">{count} selected · {players.length} registered</span></div>
  <p className="form-help">Select the actual players who will play. Parent availability is shown for information only and does not automatically select a player.</p>
  <div className="table-wrap"><table className="squad-table"><thead><tr><th>Player</th><th>Parent availability</th><th>Playing</th></tr></thead><tbody>
   {players.map(p=>{const yes=selected(p.player_id);const av=availabilityFor(p.player_id);const status=av?.status??'PENDING';return <tr key={p.player_id}><td><strong>{playerName(p)}</strong></td><td><span className={`status ${status==='AVAILABLE'?'active':''}`}>{status.replaceAll('_',' ')}</span>{av?.note&&<div className="form-help">{av.note}</div>}</td><td><button className={yes?'button':'secondary-button'} disabled={pending||(!yes&&count>=14)} onClick={()=>start(async()=>{const fd=new FormData();fd.set('match_id',matchId);fd.set('team_id',team.id);fd.set('player_id',p.player_id);fd.set('selected',String(!yes));const r=await setMatchPlayerSelection(fd);setMsg(r.message);if(r.ok&&typeof r.selected_count==='number')onCountChange(r.selected_count)})}>{yes?'Selected':'Select'}</button></td></tr>})}
  </tbody></table></div>
  <div style={{marginTop:12,fontWeight:800}}>{count<6?'Select at least 6 players':count>14?'Maximum 14 players':'Squad valid'} · {count}/14</div>
  {msg&&<div className="success" style={{marginTop:12}}>{msg}</div>}
 </section>
}

export function MatchSquadClient({matchId,home,away,homePlayers,awayPlayers,availability,selections}:{matchId:string;home:Team;away:Team;homePlayers:Player[];awayPlayers:Player[];availability:Availability[];selections:Selected[]}){
 const[homeCount,setHomeCount]=useState(selections.filter(s=>s.team_id===home.id&&s.selected).length);
 const[awayCount,setAwayCount]=useState(selections.filter(s=>s.team_id===away.id&&s.selected).length);
 return <section className="section"><div className="eyebrow">Playing squads</div><h2>Select match players</h2><p className="subtitle">The scorer or coach preparing the match selects 6–14 players for each team. Parent availability is not the final squad selection.</p><div className="grid" style={{marginBottom:16}}><div className="card"><div className="stat-label">{home.name}</div><div className="stat">{homeCount}/14</div><span className="pill">{homeCount>=6&&homeCount<=14?'Valid squad':'6–14 required'}</span></div><div className="card"><div className="stat-label">{away.name}</div><div className="stat">{awayCount}/14</div><span className="pill">{awayCount>=6&&awayCount<=14?'Valid squad':'6–14 required'}</span></div></div><div className="match-squad-grid"><TeamSquad matchId={matchId} team={home} players={homePlayers} availability={availability} selections={selections} onCountChange={setHomeCount}/><TeamSquad matchId={matchId} team={away} players={awayPlayers} availability={availability} selections={selections} onCountChange={setAwayCount}/></div></section>
}
