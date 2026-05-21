import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server';

async function checkAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'admin') return false;
  return true;
}

// GET ?negocioId=X — devuelve credentials (sin exponer el token)
export async function GET(request: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const negocioId = request.nextUrl.searchParams.get('negocioId');
  if (!negocioId) return NextResponse.json({ error: 'negocioId requerido' }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from('negocios')
    .select('id, nombre, meta_phone_number_id, meta_access_token, demo_telefono')
    .eq('id', negocioId)
    .single();

  return NextResponse.json({
    phoneNumberId: data?.meta_phone_number_id ?? '',
    tokenConfigured: !!data?.meta_access_token,
    nombre: data?.nombre ?? '',
    demoTelefono: data?.demo_telefono ?? '',
  });
}

// POST — guarda credenciales o renueva token
export async function POST(request: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { negocioId, phoneNumberId, accessToken, demoTelefono, renovar } = await request.json();
  if (!negocioId) return NextResponse.json({ error: 'negocioId requerido' }, { status: 400 });

  const admin = createSupabaseAdmin();

  // Renovar token (intercambio por 60 días)
  if (renovar && accessToken) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) return NextResponse.json({ error: 'APP_ID o APP_SECRET no configurados' }, { status: 500 });

    const res = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`
    );
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      return NextResponse.json({ error: data.error?.message ?? 'Error al renovar token' }, { status: 400 });
    }
    await admin.from('negocios').update({ meta_access_token: data.access_token }).eq('id', negocioId);
    const expiresInDays = data.expires_in ? Math.floor(data.expires_in / 86400) : 60;
    return NextResponse.json({ success: true, expiresInDays });
  }

  // Copiar credenciales del negocio principal
  if (request.nextUrl.searchParams.get('action') === 'copiar-principal') {
    const principal = process.env.NEGOCIO_PRINCIPAL_EMAIL || 'team@turnos.local';
    const { data: src } = await admin
      .from('negocios')
      .select('meta_phone_number_id, meta_access_token')
      .eq('email', principal)
      .single();
    if (!src?.meta_access_token) return NextResponse.json({ error: 'El negocio principal no tiene credenciales configuradas' }, { status: 400 });
    const { error } = await admin.from('negocios')
      .update({ meta_phone_number_id: src.meta_phone_number_id, meta_access_token: src.meta_access_token })
      .eq('id', negocioId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  // Guardar credenciales
  const update: Record<string, string> = {};
  if (phoneNumberId !== undefined) update.meta_phone_number_id = phoneNumberId;
  if (accessToken) update.meta_access_token = accessToken;
  if (demoTelefono !== undefined) update.demo_telefono = demoTelefono;

  const { error } = await admin.from('negocios').update(update).eq('id', negocioId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
