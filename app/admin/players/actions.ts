'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function admin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');
  const { data: role } = await supabase.from('jcm_user_roles').select('role').eq('user_id', user.id).eq('role', 'SYSTEM_ADMIN').eq('active', true).maybeSingle();
  if (!role) throw new Error('System Admin access required.');
  return supabase;
}

export async function createPlayer(formData: FormData) {
  const supabase = await admin();
  const schoolId = String(formData.get('school_id') ?? '');
  const firstName = String(formData.get('first_name') ?? '').trim();
  const surname = String(formData.get('surname') ?? '').trim();
  const dob = String(formData.get('date_of_birth') ?? '').trim();
  const gender = String(formData.get('gender') ?? '').trim();
  if (!schoolId || !firstName || !surname) return { ok: false, message: 'School, first name and surname are required.' };
  const { error } = await supabase.from('jcm_players').insert({ school_id: schoolId, first_name: firstName, surname, date_of_birth: dob || null, gender: gender || null });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin/players');
  return { ok: true, message: `${firstName} ${surname} was added.` };
}

export async function assignPlayerToTeam(formData: FormData) {
  const supabase = await admin();
  const playerId = String(formData.get('player_id') ?? '');
  const teamId = String(formData.get('team_id') ?? '');
  if (!playerId || !teamId) return { ok: false, message: 'Player and team are required.' };

  const [{ data: player }, { data: team }] = await Promise.all([
    supabase.from('jcm_players').select('school_id').eq('id', playerId).maybeSingle(),
    supabase.from('jcm_teams').select('id,school_id,season_id,name').eq('id', teamId).maybeSingle(),
  ]);
  if (!player || !team) return { ok: false, message: 'Player or team could not be found.' };
  if (player.school_id !== team.school_id) return { ok: false, message: 'A player can only be assigned to a team from the same school.' };

  const { error } = await supabase.from('jcm_team_players').insert({ team_id: team.id, player_id: playerId, season_id: team.season_id });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin/players');
  return { ok: true, message: `Player assigned to ${team.name}.` };
}
