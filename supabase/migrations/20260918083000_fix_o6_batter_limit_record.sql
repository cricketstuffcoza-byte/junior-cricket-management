-- Fix O/6 batter-limit validation in scoring event wrapper.
-- The previous query selected an expression into a record variable without
-- exposing a "balls" field, causing deliveries to fail.

create or replace function public.jcm_process_scoring_event(
  p_match_id uuid,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb,
  p_client_event_id uuid default gen_random_uuid()
) returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  m record; st record; i record; s record; rs record; core_result jsonb;
  v_balls_to_count boolean := false; v_unplayable boolean := false;
  v_runs integer := 0; v_pair_balls integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not public.jcm_can_score_match(p_match_id) then raise exception 'Scoring access denied for this match.'; end if;
  select * into m from public.jcm_matches where id=p_match_id;
  if not found then raise exception 'Match not found.'; end if;
  select * into st from public.jcm_match_state where match_id=p_match_id for update;
  if not found then raise exception 'Match state not initialized.'; end if;
  select * into i from public.jcm_innings where id=st.innings_id for update;
  if not found then raise exception 'Active innings not found.'; end if;
  select * into rs from public.jcm_rule_sets where code=m.ruleset and active;
  if not found then raise exception 'Ruleset % is not active.',m.ruleset; end if;

  if m.ruleset='U6' then
    if p_event_type in ('RUN','WICKET','RUN_OUT','COACH_THROW') then v_balls_to_count := true; end if;
    if p_event_type in ('RUN','WIDE','NO_BALL','WICKET','RUN_OUT','COACH_THROW')
       and st.pending_workflow in ('BATTER_REPLACEMENT','PAIR_REQUIRED','BOWLER_REQUIRED','INNINGS_COMPLETE','TARGET_REACHED','MATCH_COMPLETE') then
      raise exception 'Complete the pending O/6 workflow (%) before scoring another delivery.',st.pending_workflow;
    end if;
    if p_event_type='RETIREMENT' then raise exception 'Retirement is not used in O/6.'; end if;
    if p_event_type='COACH_THROW' then
      v_unplayable := coalesce((p_payload->>'unplayable')::boolean,false);
      v_runs := greatest(coalesce((p_payload->>'runs')::integer,0),0);
      if not v_unplayable then raise exception 'O/6 Coach Throw must be marked as unplayable.'; end if;
      if v_runs > 2 then raise exception 'O/6 Coach Throw may record 0, 1 or 2 runs.'; end if;
    end if;
    if v_balls_to_count and st.striker_id is not null then
      select coalesce(pms.balls,0) as balls into s
      from public.jcm_player_match_stats pms
      where pms.match_id=p_match_id and pms.innings_no=i.innings_no and pms.player_id=st.striker_id;
      if coalesce(s.balls,0) >= rs.batter_max_balls then
        raise exception 'O/6 batter has reached the 8-ball limit. Select the correct next batter before continuing.';
      end if;
    end if;
    if v_balls_to_count and st.batting_pair_id is not null then
      select coalesce(bp.pair_balls,0) into v_pair_balls from public.jcm_batting_pairs bp where bp.id=st.batting_pair_id;
      if v_pair_balls >= rs.pair_max_balls then raise exception 'O/6 batting pair has reached the 16-ball limit. Complete the pair before continuing.'; end if;
    end if;
    if p_event_type='SET_PAIR' and st.pending_workflow <> 'PAIR_REQUIRED' then raise exception 'A new O/6 batting pair can only be selected when the current pair is complete.'; end if;
    if p_event_type='REPLACE_BATTER' and st.pending_workflow <> 'BATTER_REPLACEMENT' then raise exception 'A new batter can only be selected after a wicket or retirement workflow.'; end if;
    if p_event_type='SET_BOWLER' and st.pending_workflow <> 'BOWLER_REQUIRED' then raise exception 'A new O/6 bowler can only be selected at the start of a new over.'; end if;
  end if;

  core_result := public.jcm_process_scoring_event_core(p_match_id,p_event_type,p_payload,p_client_event_id);
  if m.ruleset='U6' and p_event_type='COACH_THROW' then
    update public.jcm_player_match_stats set balls=balls+1
    where match_id=p_match_id and innings_no=i.innings_no and player_id=st.striker_id;
  end if;
  return core_result;
end;
$function$;