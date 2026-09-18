'use client';

import {useState,useTransition,type FormEvent} from 'react';
import {addRolesToExistingSchoolUser} from './actions';

const ROLE_OPTIONS=[['SCHOOL_ADMIN','School Admin'],['SCHOOL_STAFF','Users'],['COACH','Coach'],['SCORER','Scorer'],['PARENT','Parent']] as const;

export function ExistingUserRoleManager({schoolId}:{schoolId:string}){
 const[email,setEmail]=useState('');
 const[roles,setRoles]=useState<string[]>([]);
 const[pending,start]=useTransition();
 const[message,setMessage]=useState('');
 const[error,setError]=useState(false);
 const toggle=(role:string)=>setRoles(current=>current.includes(role)?current.filter(x=>x!==role):[...current,role]);
 const submit=(event:FormEvent)=>{
  event.preventDefault();setMessage('');setError(false);
  const form=new FormData();form.set('school_id',schoolId);form.set('email',email.trim());roles.forEach(role=>form.append('roles',role));
  start(async()=>{try{const result=await addRolesToExistingSchoolUser(form);setMessage(result.message);setError(!result.ok);if(result.ok){setEmail('');setRoles([])}}catch(err){setError(true);setMessage(err instanceof Error?err.message:'Unable to update user roles.')}});
 };
 return <section className="card" id="existing-user-roles">
  <div className="section-title">Add roles to an existing user</div>
  <p className="form-help">Use this when the person already has a JCM login. Their password and existing roles are unchanged; the selected roles are added to this school.</p>
  <form className="admin-form" onSubmit={submit}>
   <div className="field"><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="existing.user@school.co.za" required/></div>
   <div className="field"><label>Roles to add</label><div className="jcm-role-grid">{ROLE_OPTIONS.map(([value,label])=><label className="jcm-role-option" key={value}><input type="checkbox" checked={roles.includes(value)} onChange={()=>toggle(value)}/><span>{label}</span></label>)}</div></div>
   <button className="button" disabled={pending}>{pending?'Updating roles…':'Add selected roles'}</button>
   {message&&<div className={error?'error':'success'}>{message}</div>}
  </form>
 </section>;
}
