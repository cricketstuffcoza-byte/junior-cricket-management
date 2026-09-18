-- Keep U6 batter-allocation checks aligned with active playable balls.
-- Undone events must not count, and Coach Throw is unplayable for the batter.
do $$
declare
  def text;
  old text := $old$
      select count(*) into v_pair_batter_balls
      from public.jcm_scoring_events e
      join public.jcm_batting_pairs bp on bp.id=st.batting_pair_id
      where e.innings_id=i.id
        and e.created_at >= bp.created_at
        and e.event_type in ('RUN','WICKET','COACH_THROW')
        and e.striker_id=st.striker_id
        and coalesce((e.resulting_state->>'over_ball_count')::integer,0) >= 0;
$old$;
  new text := $new$
      select count(*) into v_pair_batter_balls
      from public.jcm_scoring_events e
      join public.jcm_batting_pairs bp on bp.id=st.batting_pair_id
      where e.innings_id=i.id
        and e.created_at >= bp.created_at
        and e.event_type in ('RUN','WICKET')
        and e.striker_id=st.striker_id
        and not exists (
          select 1
          from public.jcm_undo_log u
          where u.match_id=e.match_id
            and u.undone_event_id=e.id
        );
$new$;
begin
  select pg_get_functiondef(p.oid) into def
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='jcm_process_scoring_event'
    and pg_get_function_arguments(p.oid) like '%p_match_id%';
  if def is null then raise exception 'Function not found'; end if;
  if position(old in def)=0 then raise exception 'Expected U6 batter-count block not found'; end if;
  def := replace(def,old,new);
  execute def;
end $$;
