import { NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server';

async function getNegocioId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('negocio_id').eq('id', user.id).single();
  return profile?.negocio_id ?? null;
}

export async function GET(request: Request) {
  const negocioId = await getNegocioId();
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const telefono = searchParams.get('telefono');
  if (!telefono) return NextResponse.json({ error: 'Falta telefono' }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from('bot_pausas')
    .select('pausado_hasta')
    .eq('negocio_id', negocioId)
    .eq('telefono', telefono)
    .single();

  const activa = !!data && new Date(data.pausado_hasta) > new Date();
  return NextResponse.json({ activa, pausado_hasta: activa ? data!.pausado_hasta : null });
}

export async function DELETE(request: Request) {
  const negocioId = await getNegocioId();
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { telefono } = await request.json();
  if (!telefono) return NextResponse.json({ error: 'Falta telefono' }, { status: 400 });

  const admin = createSupabaseAdmin();
  await admin.from('bot_pausas').delete().eq('negocio_id', negocioId).eq('telefono', telefono);

  return NextResponse.json({ success: true });
}
