import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin.from('profiles').select('negocio_id').eq('id', user.id).single();
  const negocioId = profile!.negocio_id;

  const { data: negocio } = await admin.from('negocios').select('mp_suscripcion_id').eq('id', negocioId).single();
  if (!negocio?.mp_suscripcion_id) return NextResponse.json({ error: 'Sin suscripción activa' }, { status: 400 });

  const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${negocio.mp_suscripcion_id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'cancelled' }),
  });

  if (!mpRes.ok) {
    return NextResponse.json({ error: 'Error al cancelar en MP' }, { status: 500 });
  }

  await admin.from('negocios').update({ mp_suscripcion_estado: 'cancelada' }).eq('id', negocioId);

  return NextResponse.json({ ok: true });
}
