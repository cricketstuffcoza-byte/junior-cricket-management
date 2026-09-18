do $$
declare src text;
begin
  select pg_get_functiondef(p.oid) into src
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='jcm_process_scoring_event_core';

  src := replace(src,
    'if rs.equal_batting_opportunity and st.batting_pair_id is not null and p_event_type in(''RUN'',''WICKET'',''COACH_THROW'') and(select pair_balls from public.jcm_batting_pairs where id=st.batting_pair_id)>=rs.pair_max_balls-((rs.pair_max_balls-8)*public.jcm_is_extra_batting_pair(i.id,st.batting_pair_id)::integer)-((rs.pair_max_balls-8)*public.jcm_is_extra_batting_pair(i.id,st.batting_pair_id)::integer) then update public.jcm_batting_pairs set completed=true where id=st.batting_pair_id;update public.jcm_match_state set pending_workflow=''PAIR_REQUIRED'' where match_id=p_match_id;end if;',
    'if rs.equal_batting_opportunity and st.batting_pair_id is not null and p_event_type in(''RUN'',''WICKET'',''COACH_THROW'') and(select pair_balls from public.jcm_batting_pairs where id=st.batting_pair_id)>=rs.pair_max_balls-((rs.pair_max_balls-8)*public.jcm_is_extra_batting_pair(i.id,st.batting_pair_id)::integer)-((rs.pair_max_balls-8)*public.jcm_is_extra_batting_pair(i.id,st.batting_pair_id)::integer) then
      update public.jcm_batting_pairs set completed=true where id=st.batting_pair_id;
      if (select pair_no from public.jcm_batting_pairs where id=st.batting_pair_id) <
         ceil((select count(*) from public.jcm_match_players mp where mp.match_id=p_match_id and mp.team_id=i.batting_team_id and mp.selected)::numeric/2) +
         greatest(0,
           (select count(*) from public.jcm_match_players mp where mp.match_id=p_match_id and mp.team_id=i.fielding_team_id and mp.selected) -
           (select count(*) from public.jcm_match_players mp where mp.match_id=p_match_id and mp.team_id=i.batting_team_id and mp.selected)
         ) then
        update public.jcm_match_state set pending_workflow=''PAIR_REQUIRED'',workflow_state=''{}''::jsonb where match_id=p_match_id;
      else
        update public.jcm_match_state
        set pending_workflow=case when v_delivery and v_legal and (st.over_ball_count+1)>=rs.legal_balls_per_over then ''INNINGS_COMPLETE'' else null end,
            workflow_state=case when v_delivery and v_legal and (st.over_ball_count+1)>=rs.legal_balls_per_over then jsonb_build_object(''reason'',''FINAL_PAIR_COMPLETE'') else ''{}''::jsonb end
        where match_id=p_match_id;
      end if;
    end if;'
  );

  src := replace(src,
    'pending_workflow=case when pending_workflow=''PAIR_REQUIRED'' then ''PAIR_REQUIRED'' else ''BOWLER_REQUIRED'' end,workflow_state=''{}''::jsonb,state_version=state_version+1',
    'pending_workflow=case
      when pending_workflow in(''PAIR_REQUIRED'',''INNINGS_COMPLETE'',''TARGET_REACHED'') then pending_workflow
      when rs.equal_batting_opportunity
        and st.batting_pair_id is not null
        and coalesce((select bp.completed from public.jcm_batting_pairs bp where bp.id=st.batting_pair_id),false)
        and (select bp.pair_no from public.jcm_batting_pairs bp where bp.id=st.batting_pair_id) >=
          ceil((select count(*) from public.jcm_match_players mp where mp.match_id=p_match_id and mp.team_id=i.batting_team_id and mp.selected)::numeric/2) +
          greatest(0,
            (select count(*) from public.jcm_match_players mp where mp.match_id=p_match_id and mp.team_id=i.fielding_team_id and mp.selected) -
            (select count(*) from public.jcm_match_players mp where mp.match_id=p_match_id and mp.team_id=i.batting_team_id and mp.selected)
          )
        then ''INNINGS_COMPLETE''
      else ''BOWLER_REQUIRED'' end,
      workflow_state=case when pending_workflow in(''INNINGS_COMPLETE'',''TARGET_REACHED'') then workflow_state else ''{}''::jsonb end,state_version=state_version+1'
  );

  if src is null or position('FINAL_PAIR_COMPLETE' in src)=0 then
    raise exception 'Expected scoring core patterns were not found; migration not applied.';
  end if;

  execute src;
end $$;