'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function linkSchoolUser(formData: FormData) {
  const supabase = await createClient();
  const schoolId = String(formData.get('school_id') ?? '');
  const email = String(formData.get('email') ?? '').trim();
  const fullName = String(formData.get('full_name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const role = String(formData.get('role') ?? '');
  if (!schoolId || !email || !role) return { ok:false, message:'School, email and role are required.' };
  const { error } = await supabase.rpc('jcm_school_admin_link_user', { p_school_id: schoolId, p_email: email, p_full_name: fullName, p_phone: phone, p_role: role });
  if (error) return { ok:false, message:error.message };
  revalidatePath('/school');
  return { ok:true, message:`${email} was linked to this school as ${role.replace('_',' ')}.` };
}

export async function removeSchoolUser(schoolId: string, userId: string, role: string) {
  const supabase = await createClient();
  if (!['COACH','SCORER','PARENT'].includes(role)) return { ok:false, message:'This role cannot be removed here.' };
  const { error } = await supabase.from('jcm_school_users').update({ active:false }).eq('school_id',schoolId).eq('user_id',userId).eq('role',role);
  if (error) return { ok:false, message:error.message };
  revalidatePath('/school');
  return { ok:true, message:'School access deactivated.' };
}
