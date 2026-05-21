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

export async function GET() {
  const negocioId = await getNegocioId();
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { phoneId, token } = await getMetaCreds(negocioId);
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneId}/whatsapp_business_profile?fields=about,description,email,profile_picture_url,websites`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  );
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error?.message ?? 'Error al obtener perfil' }, { status: res.status });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const negocioId = await getNegocioId();
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { description, email, website } = await request.json();
  const { phoneId, token } = await getMetaCreds(negocioId);

  const body: Record<string, unknown> = { messaging_product: 'whatsapp' };
  if (description !== undefined) body.description = description;
  if (email !== undefined) body.email = email;
  if (website !== undefined) body.websites = website ? [website] : [];

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/whatsapp_business_profile`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error?.message ?? 'Error al guardar' }, { status: res.status });
  return NextResponse.json({ success: true });
}
