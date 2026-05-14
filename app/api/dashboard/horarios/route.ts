import { NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('negocio_id')
    .eq('id', user.id)
    .single();

  if (!profile?.negocio_id) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 400 });

  const { data: horarios, error } = await supabase
    .from('horarios')
    .select('id, dia_semana, hora, activo')
    .eq('negocio_id', profile.negocio_id)
    .order('hora');

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ horarios });
}

export async function PUT(request: Request) {
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
  if (!horarios || horarios.length === 0)
    return NextResponse.json({ error: 'Debés generar al menos un turno.' }, { status: 400 });

  const admin = createSupabaseAdmin();
  const negocio_id = profile.negocio_id;

  const { error: deleteError } = await admin
    .from('horarios')
    .delete()
    .eq('negocio_id', negocio_id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

  const rows = horarios.map((h: { dia_semana: string; hora: string }) => ({
    ...h,
    negocio_id,
    activo: true,
  }));

  const { error: insertError } = await admin.from('horarios').insert(rows);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
