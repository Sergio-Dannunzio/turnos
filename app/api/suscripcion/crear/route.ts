import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server';

// Precios en ARS — ajustar según tipo de cambio del momento
const PRECIOS: Record<string, { monto: number; titulo: string }> = {
  basico: { monto: Number(process.env.MP_PRECIO_BASICO ?? 35000), titulo: 'Plan Básico — BotTurnos' },
  pro:    { monto: Number(process.env.MP_PRECIO_PRO ?? 50000),    titulo: 'Plan Pro — BotTurnos' },
};

const DESCUENTO_PRIMER_MES = 0.25;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { planId } = await req.json();
  if (!PRECIOS[planId]) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin.from('profiles').select('negocio_id').eq('id', user.id).single();
  const negocioId = profile!.negocio_id;

  const { data: negocio } = await admin.from('negocios').select('plan').eq('id', negocioId).single();
  const esTrial = negocio?.plan === 'trial';
  const monto = esTrial
    ? Math.round(PRECIOS[planId].monto * (1 - DESCUENTO_PRIMER_MES) * 100) / 100
    : PRECIOS[planId].monto;

  const body = {
    reason: PRECIOS[planId].titulo,
    external_reference: `negocio_${negocioId}_${planId}`,
    payer_email: user.email,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: monto,
      currency_id: 'ARS',
    },
    back_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/plan`,
    status: 'pending',
  };

  console.log('MP_ACCESS_TOKEN prefix:', process.env.MP_ACCESS_TOKEN?.slice(0, 10));

  const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const mp = await mpRes.json();
  if (!mp.init_point) {
    console.error('MP error:', mp);
    return NextResponse.json({ error: 'Error al crear suscripción en MP' }, { status: 500 });
  }

  await admin.from('negocios').update({
    mp_suscripcion_id: mp.id,
    mp_suscripcion_estado: 'pendiente',
  }).eq('id', negocioId);

  return NextResponse.json({ init_point: mp.init_point });
}
