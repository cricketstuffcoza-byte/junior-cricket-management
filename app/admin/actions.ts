'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function requireSystemAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');
  const { data: role } = await supabase
    .from('jcm_user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'SYSTEM_ADMIN')
    .eq('active', true)
    .maybeSingle();
  if (!role) throw new Error('System Admin access required.');
  return supabase;
}

export async function bootstrapSystemAdmin() {
  const supabase = await createClient();
  const { error } = await supabase.rpc('jcm_bootstrap_system_admin');
  if (error) return { ok: false, message: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/admin');
  return { ok: true, message: 'Your account is now the JCM System Admin.' };
}

export async function createSchool(formData: FormData) {
  const supabase = await requireSystemAdmin();
  const name = String(formData.get('name') ?? '').trim();
  const shortName = String(formData.get('short_name') ?? '').trim();
  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  if (!name || !code) return { ok: false, message: 'School name and code are required.' };
  const { error } = await supabase.from('jcm_schools').insert({ name, short_name: shortName || null, code });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin');
  return { ok: true, message: `${name} was added.` };
}

export async function createSeason(formData: FormData) {
  const supabase = await requireSystemAdmin();
  const schoolId = String(formData.get('school_id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const year = Number(formData.get('year'));
  const startDate = String(formData.get('start_date') ?? '').trim();
  const endDate = String(formData.get('end_date') ?? '').trim();
  if (!schoolId || !name || !Number.isInteger(year)) return { ok: false, message: 'School, season name and year are required.' };
  const { error } = await supabase.from('jcm_seasons').insert({ school_id: schoolId, name, year, start_date: startDate || null, end_date: endDate || null });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin');
  return { ok: true, message: `${name} ${year} was added.` };
}

export async function createTeam(formData: FormData) {
  const supabase = await requireSystemAdmin();
  const schoolId = String(formData.get('school_id') ?? '');
  const seasonId = String(formData.get('season_id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  const ageGroup = String(formData.get('age_group') ?? '');
  if (!schoolId || !seasonId || !name || !['U/6', 'U/7', 'U/8'].includes(ageGroup)) return { ok: false, message: 'School, season, team name and age group are required.' };
  const { error } = await supabase.from('jcm_teams').insert({ school_id: schoolId, season_id: seasonId, name, code: code || null, age_group: ageGroup });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin');
  return { ok: true, message: `${name} was added.` };
}
