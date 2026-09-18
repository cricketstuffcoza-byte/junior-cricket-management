-- 2026-09-18: Preserve the batter who faced the delivery in scoring events.
-- Strike rotation must update match state after the delivery, but the event itself
-- must retain the original striker/non-striker for correct ball-by-ball and stats.

do $outer$
declare fn text;
begin
  select pg_get_functiondef('public.jcm_process_scoring_event_core(uuid,text,jsonb,uuid)'::regprocedure) into fn;

  fn:=replace(fn,
    'v_batter uuid;v_fielder uuid;v_runs integer:=0;',
    'v_batter uuid;v_fielder uuid;v_event_striker uuid;v_event_non uuid;v_runs integer:=0;'
  );

  fn:=replace(fn,
    'v_striker:=st.striker_id;v_non:=st.non_striker_id;v_bowler:=st.current_bowler_id;v_runs:=greatest',
    'v_striker:=st.striker_id;v_non:=st.non_striker_id;v_event_striker:=v_striker;v_event_non:=v_non;v_bowler:=st.current_bowler_id;v_runs:=greatest'
  );

  fn:=replace(fn,
    'case when p_event_type in(''RUN'',''WIDE'',''NO_BALL'',''WICKET'',''RUN_OUT'',''COACH_THROW'',''RETIREMENT'') then v_striker else st.striker_id end,case when p_event_type in(''RUN'',''WIDE'',''NO_BALL'',''WICKET'',''RUN_OUT'',''COACH_THROW'',''RETIREMENT'') then v_non else st.non_striker_id end',
    'case when p_event_type in(''RUN'',''WIDE'',''NO_BALL'',''WICKET'',''RUN_OUT'',''COACH_THROW'',''RETIREMENT'') then v_event_striker else st.striker_id end,case when p_event_type in(''RUN'',''WIDE'',''NO_BALL'',''WICKET'',''RUN_OUT'',''COACH_THROW'',''RETIREMENT'') then v_event_non else st.non_striker_id end'
  );

  execute fn;
end $outer$;
