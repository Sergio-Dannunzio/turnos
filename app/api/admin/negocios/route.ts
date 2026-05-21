import { NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const admin = createSupabaseAdmin();
  const { data: negocios } = await admin.from('negocios').select('id, nombre, email').order('id');
  return NextResponse.json({ negocios: negocios ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { nombre, email, telefono, direccion, password } = await request.json();

  const admin = createSupabaseAdmin();

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'cliente', setup_completado: false },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { data: negocio, error: negocioError } = await admin
    .from('negocios')
    .insert({ nombre, email, telefono, direccion })
    .select()
    .single();

  if (negocioError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: negocioError.message }, { status: 400 });
  }

  const { error: profileError } = await admin
    .from('profiles')
    .insert({ id: authUser.user.id, negocio_id: negocio.id, role: 'cliente' });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
