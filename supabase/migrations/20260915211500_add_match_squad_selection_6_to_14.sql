create or replace function public.jcm_set_match_player_selection(
  p_match_id uuid,
  p_team_id uuid,
  p_player_id uuid,
  p_selected boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  m record;
  selected_count integer;
begin
  if not public.jcm_can_score_match(p_match_id) then
    raise exception 'Coach, School Admin, assigned scorer, or authorized scorer access required.';
  end if;

  select * into m from public.jcm_matches where id = p_match_id;
  if not found then raise exception 'Match not found.'; end if;
  if p_team_id not in (m.team_a_id, m.team_b_id) then raise exception 'Team is not part of this match.'; end if;
  if not exists (select 1 from public.jcm_team_players tp where tp.team_id=p_team_id and tp.player_id=p_player_id and tp.status='ACTIVE') then raise exception 'Player is not active in this team.'; end if;

  if p_selected then
    select count(*) into selected_count from public.jcm_match_players mp where mp.match_id=p_match_id and mp.team_id=p_team_id and mp.selected;
    if selected_count >= 14 then raise exception 'A match squad may contain a maximum of 14 players.'; end if;
  end if;

  insert into public.jcm_match_players(match_id,team_id,player_id,selected)
  values(p_match_id,p_team_id,p_player_id,p_selected)
  on conflict(match_id,player_id) do update set team_id=excluded.team_id,selected=excluded.selected;

  select count(*) into selected_count from public.jcm_match_players mp where mp.match_id=p_match_id and mp.team_id=p_team_id and mp.selected;
  return jsonb_build_object('ok',true,'team_id',p_team_id,'selected_count',selected_count,'minimum',6,'maximum',14,'valid',selected_count between 6 and 14);
end;
$$;

revoke all on function public.jcm_set_match_player_selection(uuid,uuid,uuid,boolean) from public;
grant execute on function public.jcm_set_match_player_selection(uuid,uuid,uuid,boolean) to authenticated;

create or replace function public.jcm_validate_match_squads(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  m record;
  a_count integer;
  b_count integer;
begin
  if not public.jcm_can_score_match(p_match_id) then raise exception 'Not authorized to prepare this match.'; end if;
  select * into m from public.jcm_matches where id=p_match_id;
  if not found then raise exception 'Match not found.'; end if;
  select count(*) into a_count from public.jcm_match_players where match_id=p_match_id and team_id=m.team_a_id and selected;
  select count(*) into b_count from public.jcm_match_players where match_id=p_match_id and team_id=m.team_b_id and selected;
  return jsonb_build_object('team_a_count',a_count,'team_b_count',b_count,'minimum',6,'maximum',14,'valid',a_count between 6 and 14 and b_count between 6 and 14);
end;
$$;

revoke all on function public.jcm_validate_match_squads(uuid) from public;
grant execute on function public.jcm_validate_match_squads(uuid) to authenticated;
