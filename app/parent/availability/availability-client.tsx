'use client';
import {useState,useTransition} from 'react';
import {respondAvailability} from './actions';
type Item={
  fixture_id:string; match_id:string|null; scheduled_at:string; fixture_type:string; home_team_name:string; away_team_name:string;
  player_id:string; player_name:string; status:string; note:string|null; availability_deadline:string|null;
  season_id:string|null; season_name:string|null; season_year:number|null; competition_id:string|null;
  competition_name:string|null; venue_id:string|null; venue_name:string|null; fixture_status:string;
};
export function AvailabilityClient({items}:{items:Item[]}){
  const[pending,start]=useTransition(); const[msg,setMsg]=useState('');
  if(!items.length)return <div className="empty">No published fixtures currently require an availability response.</div>;
  return <div style={{display:'grid',gap:16}}>{items.map((x,i)=>{
    const season=x.season_name?(x.season_year?x.season_name+' '+x.season_year:x.season_name):'Season not specified';
    const type=x.fixture_type.replaceAll('_',' ');
    return <section className="card" key={`${x.fixture_id}-${x.player_id}-${i}`}>
      <div className="section-title">{x.home_team_name} vs {x.away_team_name}</div>
      <p className="form-help">{x.player_name} · {new Date(x.scheduled_at).toLocaleString('en-ZA')} · {type}</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:8,fontSize:13,marginTop:10}}>
        <div><strong>Season:</strong> {season}</div>
        <div><strong>Competition:</strong> {x.competition_name??'Not specified'}</div>
        <div><strong>Venue:</strong> {x.venue_name??'Not specified'}</div>
        <div><strong>Fixture status:</strong> {x.fixture_status}</div>
        <div><strong>Scheduled:</strong> {new Date(x.scheduled_at).toLocaleString('en-ZA')}</div>
        <div><strong>Availability deadline:</strong> {x.availability_deadline?new Date(x.availability_deadline).toLocaleString('en-ZA'):'Not set'}</div>
      </div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:12}}>{x.match_id&&<a className="secondary-button" href={'/live/'+x.match_id}>Follow live score</a>}
        <button className="button" style={{width:'auto',marginTop:0}} disabled={pending} onClick={()=>start(async()=>{
          const fd=new FormData();fd.set('fixture_id',x.fixture_id);fd.set('player_id',x.player_id);fd.set('status','AVAILABLE');fd.set('note',x.note??'');
          const r=await respondAvailability(fd);setMsg(r.message)
        })}>Available</button>
        <button className="secondary-button" disabled={pending} onClick={()=>start(async()=>{
          const fd=new FormData();fd.set('fixture_id',x.fixture_id);fd.set('player_id',x.player_id);fd.set('status','NOT_AVAILABLE');fd.set('note',x.note??'');
          const r=await respondAvailability(fd);setMsg(r.message)
        })}>Not available</button>
        <span className="status">Current: {x.status.replaceAll('_',' ')}</span>
      </div>
      {msg&&<div className="success" style={{marginTop:12}}>{msg}</div>}
    </section>
  })}</div>
}
