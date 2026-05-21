import { NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('negocio_id').eq('id', user.id).single();
  const negocioId = profile?.negocio_id;
  if (!negocioId) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 400 });

  const { shortLivedToken } = await request.json();
  if (!shortLivedToken) return NextResponse.json({ error: 'Token requerido' }, { status: 400 });

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return NextResponse.json({ error: 'APP_ID o APP_SECRET no configurados' }, { status: 500 });

  // Intercambiar token corto por token de 60 días
  const res = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
  );
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    return NextResponse.json({ error: data.error?.message ?? 'Error al renovar token' }, { status: 400 });
  }

  // Guardar token renovado en DB
  const admin = createSupabaseAdmin();
  await admin.from('negocios').update({ meta_access_token: data.access_token }).eq('id', negocioId);

  const expiresInDays = data.expires_in ? Math.floor(data.expires_in / 86400) : 60;
  return NextResponse.json({ success: true, expiresInDays });
}
