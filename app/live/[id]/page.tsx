import {notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {LiveScoreClient} from './live-score-client';

export const dynamic='force-dynamic';

export default async function PublicLiveScorePage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data,error}=await supabase.rpc('jcm_public_live_score_feed',{p_match_id:id});
  if(error||!data) notFound();
  return <LiveScoreClient initialData={data}/>;
}
