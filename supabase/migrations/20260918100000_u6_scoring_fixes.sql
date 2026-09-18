-- U6 scoring fixes: Coach Throw ball accounting, pair/over workflow priority,
-- U6 dismissal restrictions, and delivery-event striker metadata.
-- The live database function is the source of truth; these guarded replacements
-- keep the change reproducible when migrations are replayed.

do $$
declare fn text; original_fn text;
begin
  select pg_get_functiondef(p.oid) into fn
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='jcm_process_scoring_event_core'
  order by p.oid desc limit 1;
  original_fn := fn;

  if position('balls=balls+1,coach_runs=coach_runs+' in fn)=0 then
    fn := replace(fn,
      'if p_event_type=''COACH_THROW'' then update public.jcm_player_match_stats set coach_runs=coach_runs+case when v_base_extra=''NO_BALL'' and v_outcome_type=''RUN'' then v_runs else 0 end where match_id=p_match_id and innings_no=i.innings_no and player_id=v_striker;end if;',
      'if p_event_type=''COACH_THROW'' then update public.jcm_player_match_stats set balls=balls+1,coach_runs=coach_runs+case when v_base_extra=''NO_BALL'' and v_outcome_type=''RUN'' then v_runs else 0 end where match_id=p_match_id and innings_no=i.innings_no and player_id=v_striker;end if;'
    );
  end if;

  if position('pending_workflow=case when st.current_bowler_id is null then ''BOWLER_REQUIRED'' else null end' in fn)=0 then
    fn := replace(fn,
      'update public.jcm_match_state set striker_id=v_striker,non_striker_id=v_non,batting_pair_id=v_pair_id,pair_ball_count=0,batter_ball_count=0,pending_workflow=null,state_version=st.state_version+1,updated_by=auth.uid(),updated_at=now() where match_id=p_match_id;',
      'update public.jcm_match_state set striker_id=v_striker,non_striker_id=v_non,batting_pair_id=v_pair_id,pair_ball_count=0,batter_ball_count=0,pending_workflow=case when st.current_bowler_id is null then ''BOWLER_REQUIRED'' else null end,state_version=st.state_version+1,updated_by=auth.uid(),updated_at=now() where match_id=p_match_id;'
    );
  end if;

  if position('pending_workflow=case when pending_workflow=''PAIR_REQUIRED'' then ''PAIR_REQUIRED'' else ''BOWLER_REQUIRED'' end' in fn)=0 then
    fn := replace(fn,
      'update public.jcm_match_state set striker_id=v_striker,non_striker_id=v_non,over_no=over_no+1,over_ball_count=0,current_bowler_id=null,pending_workflow=''BOWLER_REQUIRED'',workflow_state=''{}''::jsonb,state_version=state_version+1,updated_by=auth.uid(),updated_at=now() where match_id=p_match_id;',
      'update public.jcm_match_state set striker_id=v_striker,non_striker_id=v_non,over_no=over_no+1,over_ball_count=0,current_bowler_id=null,pending_workflow=case when pending_workflow=''PAIR_REQUIRED'' then ''PAIR_REQUIRED'' else ''BOWLER_REQUIRED'' end,workflow_state=''{}''::jsonb,state_version=state_version+1,updated_by=auth.uid(),updated_at=now() where match_id=p_match_id;'
    );
  end if;

  if position('Invalid O/6 dismissal type.' in fn)=0 then
    fn := replace(fn,
      'if v_dismissal not in(''BOWLED'',''CAUGHT'',''STUMPED'',''LBW'',''HIT_WICKET'',''OBSTRUCTING_THE_FIELD'') then raise exception ''Invalid dismissal type.'';end if;',
      'if m.ruleset=''U6'' and v_dismissal not in(''BOWLED'',''CAUGHT'',''RUN_OUT'',''HIT_WICKET'') then raise exception ''Invalid O/6 dismissal type.'';end if;if m.ruleset<>''U6'' and v_dismissal not in(''BOWLED'',''CAUGHT'',''STUMPED'',''LBW'',''HIT_WICKET'',''OBSTRUCTING_THE_FIELD'',''RUN_OUT'') then raise exception ''Invalid dismissal type.'';end if;'
    );
  end if;

  if position('case when p_event_type in(''RUN'',''WIDE'',''NO_BALL'',''WICKET'',''RUN_OUT'',''COACH_THROW'',''RETIREMENT'') then v_striker' in fn)=0 then
    fn := replace(fn,
      'values(p_match_id,i.id,v_seq,p_event_type,st.striker_id,st.non_striker_id,st.current_bowler_id,v_runs,',
      'values(p_match_id,i.id,v_seq,p_event_type,case when p_event_type in(''RUN'',''WIDE'',''NO_BALL'',''WICKET'',''RUN_OUT'',''COACH_THROW'',''RETIREMENT'') then v_striker else st.striker_id end,case when p_event_type in(''RUN'',''WIDE'',''NO_BALL'',''WICKET'',''RUN_OUT'',''COACH_THROW'',''RETIREMENT'') then v_non else st.non_striker_id end,case when p_event_type in(''RUN'',''WIDE'',''NO_BALL'',''WICKET'',''RUN_OUT'',''COACH_THROW'',''RETIREMENT'') then v_bowler else st.current_bowler_id end,v_runs,'
    );
  end if;

  if fn <> original_fn then execute fn; end if;
end $$;
