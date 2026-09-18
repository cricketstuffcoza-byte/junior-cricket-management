-- Correct bowling statistics: coach throws are not bowler balls; bowler wickets only count BOWLED, CAUGHT and HIT_WICKET.
-- Rebuild the derived stats immediately so existing matches are repaired as well.

create or replace function public.jcm_rebuild_player_match_stats(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  m record;
  rs record;
  e record;
  v_legal boolean;
  v_delivery boolean;
  v_completed integer;
  v_base_extra text;
  v_outcome_type text;
  v_batter uuid;
  v_runs integer;
  v_innings_no integer;
begin
  select * into m from public.jcm_matches where id=p_match_id;
  if not found then raise exception 'Match not found.'; end if;

  select * into rs from public.jcm_rule_sets where code=m.ruleset and active;
  if not found then raise exception 'Ruleset % is not active.',m.ruleset; end if;

  delete from public.jcm_player_match_stats where match_id=p_match_id;

  insert into public.jcm_player_match_stats(match_id,innings_no,player_id,team_id)
  select i.match_id,i.innings_no,mp.player_id,mp.team_id
  from public.jcm_innings i
  join public.jcm_match_players mp on mp.match_id=i.match_id and mp.selected
  where i.match_id=p_match_id
  on conflict do nothing;

  for e in
    select se.*
    from public.jcm_scoring_events se
    where se.match_id=p_match_id
      and not exists (
        select 1 from public.jcm_undo_log u
        where u.match_id=se.match_id and u.undone_event_id=se.id
      )
    order by se.sequence_number
  loop
    select innings_no into v_innings_no from public.jcm_innings where id=e.innings_id;
    v_runs:=greatest(coalesce(e.runs,0),0);
    v_completed:=greatest(coalesce((e.extras->>'completed_runs')::integer,0),0);
    v_base_extra:=upper(coalesce(e.extras->>'base_extra',''));
    v_outcome_type:=upper(coalesce(e.extras->>'outcome_type','RUN'));

    v_legal:=case
      when e.event_type='WIDE' then rs.wides_count_as_ball
      when e.event_type='NO_BALL' then rs.no_balls_count_as_ball
      when e.event_type='RUN_OUT' then coalesce((e.extras->>'legal_ball')::boolean,false)
      else true
    end;
    v_delivery:=case
      when e.event_type='RUN_OUT' then coalesce((e.extras->>'counts_as_delivery')::boolean,false)
      else true
    end;

    if e.event_type='RETIREMENT' then
      update public.jcm_player_match_stats
      set retired=true
      where match_id=p_match_id and innings_no=v_innings_no and player_id=e.striker_id;

    elsif e.event_type in ('RUN','WIDE','NO_BALL','WICKET','RUN_OUT','COACH_THROW') then
      if e.event_type='RUN' and e.striker_id is not null then
        update public.jcm_player_match_stats
        set runs=runs+v_runs, balls=balls+1,
            fours=fours+case when v_runs=4 then 1 else 0 end,
            sixes=sixes+case when v_runs=6 then 1 else 0 end
        where match_id=p_match_id and innings_no=v_innings_no and player_id=e.striker_id;

      elsif e.event_type='WIDE' and e.striker_id is not null then
        update public.jcm_player_match_stats
        set unplayable_balls=unplayable_balls+1
        where match_id=p_match_id and innings_no=v_innings_no and player_id=e.striker_id;

      elsif e.event_type='NO_BALL' and e.striker_id is not null then
        update public.jcm_player_match_stats
        set runs=runs+v_completed,
            balls=balls+case when v_completed>0 and v_legal then 1 else 0 end,
            unplayable_balls=unplayable_balls+1
        where match_id=p_match_id and innings_no=v_innings_no and player_id=e.striker_id;

      elsif e.event_type in ('WICKET','RUN_OUT') then
        v_batter:=coalesce((e.wicket->>'dismissed_player_id')::uuid,e.striker_id);
        update public.jcm_player_match_stats
        set runs=runs+v_runs,
            balls=balls+case when v_legal then 1 else 0 end,
            wickets=wickets+1,
            dismissal_type=e.dismissal_type
        where match_id=p_match_id and innings_no=v_innings_no and player_id=v_batter;

      elsif e.event_type='COACH_THROW' and e.striker_id is not null then
        v_batter:=coalesce((e.wicket->>'dismissed_player_id')::uuid,e.striker_id);
        update public.jcm_player_match_stats
        set balls=balls+1,
            runs=runs+case when v_base_extra='NO_BALL' and v_outcome_type='RUN' then v_runs else 0 end,
            coach_runs=coach_runs+case when v_base_extra='NO_BALL' and v_outcome_type='RUN' then v_runs else 0 end,
            fours=fours+case when v_base_extra='NO_BALL' and v_outcome_type='RUN' and v_runs=4 then 1 else 0 end,
            sixes=sixes+case when v_base_extra='NO_BALL' and v_outcome_type='RUN' and v_runs=6 then 1 else 0 end
        where match_id=p_match_id and innings_no=v_innings_no and player_id=e.striker_id;

        if v_outcome_type='WICKET' then
          update public.jcm_player_match_stats
          set wickets=wickets+1,dismissal_type=e.dismissal_type
          where match_id=p_match_id and innings_no=v_innings_no and player_id=v_batter;
        end if;
      end if;

      if e.bowler_id is not null then
        update public.jcm_player_match_stats
        set balls=balls+case
              when e.event_type='COACH_THROW' then 0
              when e.event_type='RUN_OUT' then case when v_delivery then 1 else 0 end
              else 1
            end,
            runs=runs+case when e.event_type='COACH_THROW' then 0 else v_runs end,
            wides=wides+case when e.event_type='WIDE' then 1 else 0 end,
            no_balls=no_balls+case when e.event_type='NO_BALL' then 1 else 0 end,
            unplayable_balls=unplayable_balls+case when e.event_type in ('WIDE','NO_BALL') then 1 else 0 end,
            wickets=wickets+case when upper(coalesce(e.dismissal_type,'')) in ('BOWLED','CAUGHT','HIT_WICKET') then 1 else 0 end
        where match_id=p_match_id and innings_no=v_innings_no and player_id=e.bowler_id;
      end if;

      if e.fielder_id is not null and e.dismissal_type='CAUGHT' then
        update public.jcm_player_match_stats
        set catches=catches+1
        where match_id=p_match_id and innings_no=v_innings_no and player_id=e.fielder_id;
      end if;

      if e.fielder_id is not null and e.dismissal_type='RUN_OUT' then
        update public.jcm_player_match_stats
        set run_outs=run_outs+1
        where match_id=p_match_id and innings_no=v_innings_no and player_id=e.fielder_id;
      end if;

      if e.fielder_id is not null and e.dismissal_type='STUMPED' then
        update public.jcm_player_match_stats
        set stumpings=stumpings+1
        where match_id=p_match_id and innings_no=v_innings_no and player_id=e.fielder_id;
      end if;
    end if;
  end loop;
end;
$function$;

revoke all on function public.jcm_rebuild_player_match_stats(uuid) from public, anon, authenticated;

do $repair$
declare r record;
begin
  for r in select id from public.jcm_matches loop
    perform public.jcm_rebuild_player_match_stats(r.id);
  end loop;
end;
$repair$;
