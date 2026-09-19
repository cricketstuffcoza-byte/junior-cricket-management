'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { assignMatchScorer } from '../operations/actions';

type UserOption = { user_id:string; full_name:string|null; email:string|null };

export function MatchScorerAssignment({
  matchId,
  currentUserId,
  users,
  compact=false,
}:{
  matchId:string;
  currentUserId:string|null;
  users:UserOption[];
  compact?:boolean;
}) {
  const router=useRouter();
  const [value,setValue]=useState(currentUserId??'');
  const [pending,start]=useTransition();
  const [message,setMessage]=useState('');

  return <div style={{minWidth:compact?190:240}}>
    <div style={{display:'flex',gap:6,alignItems:'center'}}>
      <select
        value={value}
        disabled={pending}
        onChange={e=>{
          const next=e.target.value;
          setValue(next);
          setMessage('');
          start(async()=>{
            const fd=new FormData();
            fd.set('match_id',matchId);
            fd.set('scorer_user_id',next);
            const result=await assignMatchScorer(fd);
            setMessage(result.message);
            if(result.ok) router.refresh();
            else setValue(currentUserId??'');
          });
        }}
        style={{flex:1}}
        aria-label="Assign coach or scorer"
      >
        <option value="">Unassigned</option>
        {users.map(u=><option key={u.user_id} value={u.user_id}>{u.full_name||u.email||u.user_id}</option>)}
      </select>
    </div>
    {!compact && <small style={{display:'block',marginTop:5}}>Match coach / scorer</small>}
    {message && <small style={{display:'block',marginTop:5,color:message.toLowerCase().includes('error')||message.toLowerCase().includes('not authorised')?'var(--danger)':'var(--success)'}}>{message}</small>}
  </div>;
}
