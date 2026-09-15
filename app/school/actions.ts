'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function linkSchoolUser(formData: FormData) {
  const supabase = await createClient();
  const schoolId = String(formData.get('school_id') ?? '');
  const email = String(formData.get('email') ?? '').trim();
  const fullName = String(formData.get('full_name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const role = String(formData.get('role') ?? '');
  if (!schoolId || !email || !role) return { ok:false, message:'School, email and role are required.' };
  const { error } = await supabase.rpc('jcm_school_admin_link_user', { p_school_id: schoolId, p_email: email, p_full_name: fullName, p_phone: phone, p_role: role });
  if (error) return { ok:false, message:error.message };
  revalidatePath('/school');
  return { ok:true, message:`${email} was linked to this school as ${role.replace('_',' ')}.` };
}

export async function removeSchoolUser(schoolId: string, userId: string, role: string) {
  const supabase = await createClient();
  if (!['COACH','SCORER','PARENT'].includes(role)) return { ok:false, message:'This role cannot be removed here.' };
  const { error } = await supabase.from('jcm_school_users').update({ active:false }).eq('school_id',schoolId).eq('user_id',userId).eq('role',role);
  if (error) return { ok:false, message:error.message };
  revalidatePath('/school');
  return { ok:true, message:'School access deactivated.' };
}

export async function createSchoolSeason(formData: FormData) {
  const supabase = await createClient();
  const schoolId = String(formData.get('school_id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const year = Number(formData.get('year'));
  const startDate = String(formData.get('start_date') ?? '').trim();
  const endDate = String(formData.get('end_date') ?? '').trim();
  if (!schoolId || !name || !Number.isInteger(year)) return { ok:false, message:'School, season name and year are required.' };
  const { error } = await supabase.rpc('jcm_school_admin_create_season',{p_school_id:schoolId,p_name:name,p_year:year,p_start_date:startDate||null,p_end_date:endDate||null});
  if (error) return { ok:false, message:error.message };
  revalidatePath('/school');
  return { ok:true, message:`${name} ${year} was created.` };
}

export async function createSchoolTeam(formData: FormData) {
  const supabase = await createClient();
  const schoolId = String(formData.get('school_id') ?? '');
  const seasonId = String(formData.get('season_id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const code = String(formData.get('code') ?? '').trim();
  const ageGroup = String(formData.get('age_group') ?? '');
  if (!schoolId || !seasonId || !name || !['U/6','U/7','U/8'].includes(ageGroup)) return { ok:false, message:'School, season, team name and age group are required.' };
  const { error } = await supabase.rpc('jcm_school_admin_create_team',{p_school_id:schoolId,p_season_id:seasonId,p_name:name,p_code:code,p_age_group:ageGroup});
  if (error) return { ok:false, message:error.message };
  revalidatePath('/school');
  return { ok:true, message:`${name} was created.` };
}

export async function assignTeamCoach(formData: FormData) {
  const supabase = await createClient();
  const schoolId = String(formData.get('school_id') ?? '');
  const teamId = String(formData.get('team_id') ?? '');
  const coachUserId = String(formData.get('coach_user_id') ?? '');
  const primary = String(formData.get('primary') ?? '') === 'true';
  if (!schoolId || !teamId || !coachUserId) return { ok:false, message:'Team and coach are required.' };
  const { error } = await supabase.rpc('jcm_school_admin_assign_coach',{p_school_id:schoolId,p_team_id:teamId,p_coach_user_id:coachUserId,p_primary:primary});
  if (error) return { ok:false, message:error.message };
  revalidatePath('/school');
  return { ok:true, message:'Coach assigned to team.' };
}
