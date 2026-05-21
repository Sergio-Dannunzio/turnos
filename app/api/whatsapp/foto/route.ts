import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getMetaCreds } from '@/lib/meta';

async function getNegocioId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('negocio_id').eq('id', user.id).single();
  return profile?.negocio_id ?? null;
}

export async function POST(request: Request) {
  const negocioId = await getNegocioId();
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { phoneId, token } = await getMetaCreds(negocioId);
  const GRAPH = 'https://graph.facebook.com/v21.0';
  const APP_ID = process.env.META_APP_ID;

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });

  const fileType = file.type || 'image/jpeg';
  const bytes = await file.arrayBuffer();

  // 1. Iniciar sesión de upload
  const sessionRes = await fetch(
    `${GRAPH}/${APP_ID}/uploads?file_name=${encodeURIComponent(file.name)}&file_length=${file.size}&file_type=${encodeURIComponent(fileType)}&access_token=${token}`,
    { method: 'POST' }
  );
  const sessionData = await sessionRes.json();
  if (!sessionRes.ok || !sessionData.id) {
    return NextResponse.json({ error: sessionData.error?.message ?? 'Error al iniciar upload' }, { status: 400 });
  }

  // 2. Subir el archivo
  const uploadRes = await fetch(`${GRAPH}/${sessionData.id}`, {
    method: 'POST',
    headers: { 'Authorization': `OAuth ${token}`, 'file_offset': '0', 'Content-Type': 'application/octet-stream' },
    body: bytes,
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || !uploadData.h) {
    return NextResponse.json({ error: uploadData.error?.message ?? 'Error al subir archivo' }, { status: 400 });
  }

  // 3. Asignar como foto de perfil
  const profileRes = await fetch(`${GRAPH}/${phoneId}/whatsapp_business_profile`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', profile_picture_handle: uploadData.h }),
  });
  const profileData = await profileRes.json();
  if (!profileRes.ok) {
    return NextResponse.json({ error: profileData.error?.message ?? 'Error al actualizar foto de perfil' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
