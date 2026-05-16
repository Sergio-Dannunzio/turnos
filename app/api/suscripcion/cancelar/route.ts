import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin.from('profiles').select('negocio_id').eq('id', user.id).single();
  const negocioId = profile!.negocio_id;

  // Con pago único no hay nada que cancelar en MP — solo marcamos para no renovar
  await admin.from('negocios').update({
    mp_suscripcion_estado: 'cancelada',
  }).eq('id', negocioId);

  return NextResponse.json({ ok: true });
}
