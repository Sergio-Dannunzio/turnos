import { NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server';

async function getNegocioId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('negocio_id').eq('id', user.id).single();
  return profile?.negocio_id ?? null;
}

export async function GET() {
  const negocioId = await getNegocioId();
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const admin = createSupabaseAdmin();
  const [{ data }, { data: principal }] = await Promise.all([
    admin.from('negocios').select('meta_phone_number_id, meta_access_token').eq('id', negocioId).single(),
    admin.from('negocios').select('meta_phone_number_id').eq('email', process.env.NEGOCIO_PRINCIPAL_EMAIL ?? 'team@turnos.local').single(),
  ]);

  const myPhoneId = data?.meta_phone_number_id ?? '';
  const principalPhoneId = principal?.meta_phone_number_id ?? '';
  const isSharedNumber = !myPhoneId || (!!principalPhoneId && myPhoneId === principalPhoneId);

  return NextResponse.json({
    phoneNumberId: myPhoneId,
    tokenConfigured: !!data?.meta_access_token,
    isSharedNumber,
  });
}

export async function POST(request: Request) {
  const negocioId = await getNegocioId();
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { phoneNumberId, accessToken } = await request.json();

  const admin = createSupabaseAdmin();
  const update: Record<string, string> = {};
  if (phoneNumberId !== undefined) update.meta_phone_number_id = phoneNumberId;
  if (accessToken !== undefined) update.meta_access_token = accessToken;

  const { error } = await admin.from('negocios').update(update).eq('id', negocioId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
