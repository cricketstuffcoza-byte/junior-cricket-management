'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
export async function respondAvailability(formData:FormData){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return{ok:false,message:'Authentication required.'};const {error}=await supabase.rpc('jcm_set_availability',{p_fixture_id:String(formData.get('fixture_id')??''),p_player_id:String(formData.get('player_id')??''),p_status:String(formData.get('status')??''),p_note:String(formData.get('note')??'')});if(error)return{ok:false,message:error.message};revalidatePath('/parent/availability');return{ok:true,message:'Availability saved.'}}
