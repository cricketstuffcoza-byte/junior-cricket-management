'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function userClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');
  return { supabase, user };
}

export async function createCompetition(formData: FormData) {
  const { supabase } = await userClient();
  const { data, error } = await supabase.rpc('jcm_create_competition', {
    p_name: String(formData.get('name') ?? ''),
    p_season_id: String(formData.get('season_id') ?? ''),
    p_competition_type: String(formData.get('competition_type') ?? ''),
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/operations');
  return { ok: true, message: 'Competition created.', id: data as string };
}

export async function addCompetitionTeam(formData: FormData) {
  const { supabase } = await userClient();
  const { error } = await supabase.rpc('jcm_add_competition_team', {
    p_competition_id: String(formData.get('competition_id') ?? ''),
    p_team_id: String(formData.get('team_id') ?? ''),
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/operations');
  return { ok: true, message: 'Team added to competition.' };
}

export async function createFixture(formData: FormData) {
  const { supabase } = await userClient();
  const scheduled = String(formData.get('scheduled_at') ?? '');
  const deadline = String(formData.get('availability_deadline') ?? '');
  const { data, error } = await supabase.rpc('jcm_create_fixture', {
    p_season_id: String(formData.get('season_id') ?? ''),
    p_competition_id: String(formData.get('competition_id') || '') || null,
    p_home_team_id: String(formData.get('home_team_id') ?? ''),
    p_away_team_id: String(formData.get('away_team_id') ?? ''),
    p_venue_id: String(formData.get('venue_id') || '') || null,
    p_scheduled_at: scheduled ? new Date(scheduled).toISOString() : null,
    p_fixture_type: String(formData.get('fixture_type') ?? 'FRIENDLY'),
    p_availability_deadline: deadline ? new Date(deadline).toISOString() : null,
    p_notes: String(formData.get('notes') ?? ''),
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/operations');
  return { ok: true, message: 'Fixture created as draft.', id: data as string };
}

export async function publishFixture(formData: FormData) {
  const { supabase } = await userClient();
  const { data, error } = await supabase.rpc('jcm_publish_fixture', { p_fixture_id: String(formData.get('fixture_id') ?? '') });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/operations');
  return { ok: true, message: `Fixture published. ${data ?? 0} availability requests created.` };
}

export async function setSquadSelection(formData: FormData) {
  const { supabase } = await userClient();
  const { error } = await supabase.rpc('jcm_set_squad_selection', {
    p_fixture_id: String(formData.get('fixture_id') ?? ''),
    p_team_id: String(formData.get('team_id') ?? ''),
    p_player_id: String(formData.get('player_id') ?? ''),
    p_selected: formData.get('selected') === 'true',
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/operations/fixtures/${String(formData.get('fixture_id') ?? '')}`);
  return { ok: true, message: 'Squad updated.' };
}
