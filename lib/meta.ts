import { createSupabaseAdmin } from './supabase-server';

export async function getMetaCreds(negocioId: number) {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from('negocios')
    .select('meta_phone_number_id, meta_access_token')
    .eq('id', negocioId)
    .single();

  return {
    phoneId: data?.meta_phone_number_id ?? process.env.META_PHONE_NUMBER_ID ?? '',
    token: data?.meta_access_token ?? process.env.META_ACCESS_TOKEN ?? '',
  };
}
