import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('negocio_id').eq('id', user.id).single();
  if (!profile?.negocio_id) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 400 });

  const empleadoId = req.nextUrl.searchParams.get('empleadoId');

  let query = supabase
    .from('horarios')
    .select('id, dia_semana, hora, activo, empleado_id')
    .eq('negocio_id', profile.negocio_id)
    .order('hora');

  if (empleadoId) query = query.eq('empleado_id', empleadoId);

  const { data: horarios, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: empleados } = await supabase
    .from('empleados')
    .select('id, nombre, activo')
    .eq('negocio_id', profile.negocio_id)
    .order('id');

  return NextResponse.json({ horarios, empleados: empleados ?? [] });
}

export async function PUT(request: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('negocio_id').eq('id', user.id).single();
  if (!profile?.negocio_id) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 400 });

  const { horarios, empleadoId } = await request.json();
  if (!horarios || horarios.length === 0)
    return NextResponse.json({ error: 'Debés generar al menos un turno.' }, { status: 400 });
  if (!empleadoId)
    return NextResponse.json({ error: 'Seleccioná un empleado.' }, { status: 400 });

  const admin = createSupabaseAdmin();
  const negocio_id = profile.negocio_id;

  await admin.from('horarios').delete().eq('negocio_id', negocio_id).eq('empleado_id', empleadoId);

  const rows = horarios.map((h: { dia_semana: string; hora: string }) => ({
    ...h,
    negocio_id,
    empleado_id: empleadoId,
    activo: true,
  }));

  const { error: insertError } = await admin.from('horarios').insert(rows);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
