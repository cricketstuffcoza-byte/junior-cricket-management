do $$
declare src text;
begin
  select pg_get_functiondef(p.oid) into src
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='jcm_process_scoring_event';
  src := replace(src,
    '      if v_unplayed_count >= 2 then',
    '      if v_unplayed_count = 0
         and (select count(*) from public.jcm_match_players where match_id=p_match_id and team_id=i.fielding_team_id and selected) > v_total_players
         and (select count(*) from public.jcm_batting_pairs where innings_id=i.id) < ceil(v_total_players::numeric/2) + ((select count(*) from public.jcm_match_players where match_id=p_match_id and team_id=i.fielding_team_id and selected) - v_total_players) then
        p_payload := p_payload || jsonb_build_object(''extra_pair'',true);
      elsif v_unplayed_count >= 2 then'
  );
  src := replace(src,
    '      else
        raise exception ''All selected batters have already had a batting opportunity.'';
      end if;
    end if;',
    '      elsif not coalesce((p_payload->>''extra_pair'')::boolean,false) then
        raise exception ''All selected batters have already had a batting opportunity.'';
      end if;
    end if;'
  );
  execute src;
end $$;