import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const supabase=await createClient();const {data,error}=await supabase.rpc('jcm_public_live_score_feed',{p_match_id:id});if(error||!data)return NextResponse.json({error:'Live score unavailable'},{status:404});return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}})}
