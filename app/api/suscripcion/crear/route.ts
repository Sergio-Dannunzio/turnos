import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server';

const PRECIOS: Record<string, { monto: number; titulo: string }> = {
  basico: { monto: Number(process.env.MP_PRECIO_BASICO ?? 35000), titulo: 'Plan Básico — Turnixia' },
  pro:    { monto: Number(process.env.MP_PRECIO_PRO ?? 50000),    titulo: 'Plan Pro — Turnixia' },
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
    ? Math.round(PRECIOS[planId].monto * (1 - DESCUENTO_PRIMER_MES))
    : PRECIOS[planId].monto;

  const isSandbox = process.env.MP_ACCESS_TOKEN?.startsWith('TEST-');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const body = {
    items: [{
      title: PRECIOS[planId].titulo,
      quantity: 1,
      unit_price: monto,
      currency_id: 'ARS',
    }],
    external_reference: `negocio_${negocioId}_${planId}`,
    payer: { email: isSandbox ? 'test_user_123456789@testuser.com' : user.email },
    back_urls: {
      success: `${appUrl}/dashboard/plan?pago=ok`,
      failure: `${appUrl}/dashboard/plan?pago=error`,
      pending: `${appUrl}/dashboard/plan?pago=pendiente`,
    },
    auto_return: 'approved',
    ...(isSandbox ? {} : { notification_url: `${appUrl}/api/suscripcion/webhook` }),
  };

  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const mp = await mpRes.json();
  const initPoint = isSandbox ? mp.sandbox_init_point : mp.init_point;

  if (!initPoint) {
    console.error('MP error:', mp);
    return NextResponse.json({ error: 'Error al crear preferencia de pago en MP' }, { status: 500 });
  }

  await admin.from('negocios').update({
    mp_suscripcion_estado: 'pendiente',
  }).eq('id', negocioId);

  return NextResponse.json({ init_point: initPoint });
}
