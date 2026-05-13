import { NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('negocio_id')
    .eq('id', user.id)
    .single();

  if (!profile?.negocio_id) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 400 });

  const { horarios } = await request.json();

  const admin = createSupabaseAdmin();

  const rows = horarios.map((h: { dia_semana: string; hora: string }) => ({
    ...h,
    negocio_id: profile.negocio_id,
  }));

  const { error } = await admin.from('horarios').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, setup_completado: true },
  });

  await admin.from('profiles').update({ setup_completado: true }).eq('id', user.id);

  return NextResponse.json({ success: true });
}
