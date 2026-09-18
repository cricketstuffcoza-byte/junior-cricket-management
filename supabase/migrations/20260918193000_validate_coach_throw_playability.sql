-- 2026-09-18: Coach Throw must be a valid playable continuation of Wide/No-ball.
-- Applied to production and kept in source control.
do $outer$
declare fn text;
begin
  select pg_get_functiondef('public.jcm_process_scoring_event_core(uuid,text,jsonb,uuid)'::regprocedure) into fn;
  fn:=replace(fn,
    $old$if v_base_extra not in('WIDE','NO_BALL') then raise exception 'Coach Throw must follow a wide or no-ball.';end if;if v_outcome_type not in('RUN','WICKET') then raise exception 'Coach Throw outcome must be RUN or WICKET.';end if;$old$,
    $new$if v_base_extra not in('WIDE','NO_BALL') then raise exception 'Coach Throw must follow a wide or no-ball.';end if;if v_outcome_type not in('RUN','WICKET') then raise exception 'Coach Throw outcome must be RUN or WICKET.';end if;if coalesce((st.workflow_state->>'coach_throw_pending')::boolean,false) is not true or upper(coalesce(st.workflow_state->>'coach_throw_base',''))<>v_base_extra then raise exception 'Coach Throw is only allowed immediately after the pending %.',v_base_extra;end if;$new$
  );
  execute fn;
end $outer$;

do $outer$
declare fn text;
begin
  select pg_get_functiondef('public.jcm_rebuild_player_match_stats(uuid)'::regprocedure) into fn;
  fn:=replace(fn,
    $old$select p.* into prev_e
      from public.jcm_scoring_events p
      where p.match_id=e.match_id
        and p.sequence_number < e.sequence_number
        and not exists (
          select 1 from public.jcm_undo_log u
          where u.match_id=p.match_id and u.undone_event_id=p.id
        )
      order by p.sequence_number desc
      limit 1;$old$,
    $new$select p.* into prev_e
      from public.jcm_scoring_events p
      where p.match_id=e.match_id
        and p.sequence_number=e.sequence_number-1
        and not exists (
          select 1 from public.jcm_undo_log u
          where u.match_id=p.match_id and u.undone_event_id=p.id
        )
      limit 1;$new$
  );
  execute fn;
end $outer$;

do $outer$
declare fn text;
begin
  select pg_get_functiondef('public.jcm_restore_scoring_snapshot(jsonb)'::regprocedure) into fn;
  if position('jcm_rebuild_batting_pair_balls' in fn)=0 then
    fn:=replace(fn,
      'perform public.jcm_rebuild_player_match_stats(mid);',
      'perform public.jcm_rebuild_player_match_stats(mid); perform public.jcm_rebuild_batting_pair_balls(mid);'
    );
    execute fn;
  end if;
end $outer$;

do $outer$
declare fn text;
begin
  select pg_get_functiondef('public.jcm_rebuild_batting_pair_balls(uuid)'::regprocedure) into fn;
  fn:=replace(fn,
    '  set pair_balls=coalesce((',
    '  set pair_balls=coalesce(('
  );
  -- Safe-update requires a scoped WHERE clause.
  fn:=replace(fn,
    '  ),0);',
    '  ),0) where bp.innings_id in (select id from public.jcm_innings where match_id=p_match_id);'
  );
  execute fn;
end $outer$;
