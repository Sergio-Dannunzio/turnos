import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (ADMIN_EMAIL && user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { negocioId, plan, meses } = await req.json();
  if (!negocioId || !plan) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

  const planVence = new Date();
  planVence.setMonth(planVence.getMonth() + (meses ?? 1));

  const admin = createSupabaseAdmin();
  const { error } = await admin.from('negocios').update({
    plan,
    plan_vence: planVence.toISOString(),
    mp_suscripcion_estado: 'autorizada',
  }).eq('id', negocioId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
