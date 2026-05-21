import { NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server';
import { getMetaCreds } from '@/lib/meta';

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('negocio_id')
    .eq('id', user.id)
    .single();
  const negocioId = profile?.negocio_id;
  if (!negocioId) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 400 });

  const { to, mensaje } = await request.json();
  if (!to || !mensaje?.trim()) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
  }

  const { phoneId, token } = await getMetaCreds(negocioId);
  if (!phoneId || !token) {
    return NextResponse.json({ error: 'Credenciales de WhatsApp no configuradas' }, { status: 400 });
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: mensaje.trim() },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Error enviando WhatsApp:', JSON.stringify(err));
    return NextResponse.json({ error: 'Error al enviar el mensaje' }, { status: 502 });
  }

  const admin = createSupabaseAdmin();
  const pausadoHasta = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

  await Promise.all([
    supabase.from('mensajes').insert({
      negocio_id: negocioId,
      cliente_telefono: to,
      rol: 'humano',
      contenido: mensaje.trim(),
    }),
    admin.from('bot_pausas').upsert(
      { negocio_id: negocioId, telefono: to, pausado_hasta: pausadoHasta },
      { onConflict: 'negocio_id,telefono' }
    ),
  ]);

  return NextResponse.json({ success: true, pausado_hasta: pausadoHasta });
}
