do $$
declare src text;
begin
  execute $f$
    create or replace function public.jcm_is_extra_batting_pair(p_innings_id uuid,p_pair_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $body$
      select coalesce(
        (select bp.pair_no from public.jcm_batting_pairs bp where bp.id=p_pair_id)
        >
        ceil((
          select count(*) from public.jcm_match_players mp
          join public.jcm_innings i on i.id=p_innings_id
          where mp.match_id=i.match_id and mp.team_id=i.batting_team_id and mp.selected
        )::numeric/2),
        false
      );
    $body$;
  $f$;
  select pg_get_functiondef(p.oid) into src
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='jcm_process_scoring_event_core';
  src := replace(src,
    'and(select pair_balls from public.jcm_batting_pairs where id=st.batting_pair_id)>=rs.pair_max_balls',
    'and(select pair_balls from public.jcm_batting_pairs where id=st.batting_pair_id)>=rs.pair_max_balls-((rs.pair_max_balls-8)*public.jcm_is_extra_batting_pair(i.id,st.batting_pair_id)::integer)'
  );
  execute src;
end $$;