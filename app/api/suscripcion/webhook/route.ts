import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createSupabaseAdmin } from '@/lib/supabase-server';

function verificarFirma(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;

  const xSignature = req.headers.get('x-signature') ?? '';
  const xRequestId = req.headers.get('x-request-id') ?? '';
  const dataId = new URL(req.url).searchParams.get('data.id') ?? '';
  const ts = xSignature.split(',').find(p => p.startsWith('ts='))?.split('=')[1] ?? '';
  const v1 = xSignature.split(',').find(p => p.startsWith('v1='))?.split('=')[1] ?? '';

  const expected = createHmac('sha256', secret)
    .update(`id:${dataId};request-id:${xRequestId};ts:${ts};`)
    .digest('hex');

  return expected === v1;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verificarFirma(req, rawBody)) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const admin = createSupabaseAdmin();

  if (body.type === 'payment') {
    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const payment = await mpRes.json();

    if (payment.status === 'approved' && payment.external_reference) {
      const match = payment.external_reference.match(/^negocio_(\d+)_(\w+)$/);
      if (!match) return NextResponse.json({ ok: true });

      const negocioId = Number(match[1]);
      const planId = match[2];

      const { data: negocio } = await admin.from('negocios').select('plan_vence').eq('id', negocioId).single();

      // Extender desde la fecha de vencimiento actual si sigue vigente, sino desde hoy
      const base = negocio?.plan_vence && new Date(negocio.plan_vence) > new Date()
        ? new Date(negocio.plan_vence)
        : new Date();
      base.setMonth(base.getMonth() + 1);

      await admin.from('negocios').update({
        plan: planId,
        plan_vence: base.toISOString(),
        mp_suscripcion_estado: 'activa',
      }).eq('id', negocioId);
    }

    if (payment.status === 'rejected' || payment.status === 'cancelled') {
      const match = payment.external_reference?.match(/^negocio_(\d+)_(\w+)$/);
      if (match) {
        await admin.from('negocios').update({
          mp_suscripcion_estado: 'ninguna',
        }).eq('id', Number(match[1]));
      }
    }
  }

  return NextResponse.json({ ok: true });
}
