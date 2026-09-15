'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function grantUserAccess(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get('email') ?? '').trim();
  const fullName = String(formData.get('full_name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const role = String(formData.get('role') ?? '');
  const schoolId = String(formData.get('school_id') ?? '');
  if (!email || !role || !schoolId) return { ok: false, message: 'Email, role and school are required.' };
  const { error } = await supabase.rpc('jcm_system_admin_grant_access', {
    p_email: email, p_full_name: fullName, p_phone: phone, p_role: role, p_school_id: schoolId,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin/users');
  revalidatePath('/school');
  return { ok: true, message: `${email} now has ${role.replace('_', ' ')} access.` };
}

export async function setUserActive(userId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('jcm_system_admin_set_user_active', { p_user_id: userId, p_active: active });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin/users');
  revalidatePath('/school');
  return { ok: true, message: active ? 'User access restored.' : 'User access deactivated.' };
}
