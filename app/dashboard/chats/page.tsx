'use client';

import { useEffect, useRef, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { MessageSquare } from 'lucide-react';

type Mensaje = {
  id: number;
  cliente_telefono: string;
  rol: 'cliente' | 'bot';
  contenido: string;
  creado_en: string;
};

function formatTelefono(tel: string) {
  return tel.replace('whatsapp:', '');
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatFechaCorta(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return formatHora(iso);
  if (d.toDateString() === ayer.toDateString()) return 'ayer';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export default function ChatsPage() {
  const [negocioId, setNegocioId] = useState<number | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [contactoActivo, setContactoActivo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseBrowser();

  async function cargar(nId: number) {
    const { data } = await supabase
      .from('mensajes')
      .select('*')
      .eq('negocio_id', nId)
      .order('creado_en', { ascending: true })
      .limit(1000);
    setMensajes(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('negocio_id').eq('id', user!.id).single();
      const nId = profile!.negocio_id;
      setNegocioId(nId);
      await cargar(nId);
    }
    init();
  }, []);

  useEffect(() => {
    if (!negocioId) return;
    const channel = supabase
      .channel('mensajes-chats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `negocio_id=eq.${negocioId}` }, (payload) => {
        setMensajes(prev => [...prev, payload.new as Mensaje]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [negocioId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [contactoActivo, mensajes.length]);

  // Contactos únicos ordenados por último mensaje
  const contactos = Object.values(
    mensajes.reduce((acc, m) => {
      acc[m.cliente_telefono] = { telefono: m.cliente_telefono, ultimo: m };
      return acc;
    }, {} as Record<string, { telefono: string; ultimo: Mensaje }>)
  ).sort((a, b) => b.ultimo.creado_en.localeCompare(a.ultimo.creado_en));

  const thread = contactoActivo ? mensajes.filter(m => m.cliente_telefono === contactoActivo) : [];

  // Auto-seleccionar primer contacto
  useEffect(() => {
    if (!loading && contactos.length > 0 && !contactoActivo) {
      setContactoActivo(contactos[0].telefono);
    }
  }, [loading, contactos.length]);

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 overflow-hidden rounded-xl border border-zinc-800">

      {/* Lista de contactos */}
      <div className="w-72 shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950">
        <div className="px-4 py-4 border-b border-zinc-800 shrink-0">
          <h1 className="text-base font-semibold text-white">Chats</h1>
          {!loading && (
            <p className="text-xs text-zinc-500 mt-0.5">
              {contactos.length} conversación{contactos.length !== 1 ? 'es' : ''}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="px-4 py-3 border-b border-zinc-900">
                <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse mb-2" />
                <div className="h-2 w-44 bg-zinc-900 rounded animate-pulse" />
              </div>
            ))
          ) : contactos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-600">
              <MessageSquare size={22} strokeWidth={1.5} />
              <p className="text-xs">Sin conversaciones aún</p>
            </div>
          ) : (
            contactos.map(({ telefono, ultimo }) => (
              <button
                key={telefono}
                onClick={() => setContactoActivo(telefono)}
                className={`w-full text-left px-4 py-3 border-b border-zinc-900 transition-colors ${
                  contactoActivo === telefono ? 'bg-zinc-800' : 'hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                    {formatTelefono(telefono)}
                  </span>
                  <span className="text-xs text-zinc-600 shrink-0 ml-2">
                    {formatFechaCorta(ultimo.creado_en)}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 truncate">
                  {ultimo.rol === 'bot' ? '🤖 ' : ''}{ultimo.contenido}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col bg-zinc-950 min-w-0">
        {!contactoActivo ? (
          <div className="flex-1 flex items-center justify-center text-zinc-600">
            <p className="text-sm">Seleccioná una conversación</p>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 border-b border-zinc-800 shrink-0">
              <p className="text-sm font-semibold text-white">{formatTelefono(contactoActivo)}</p>
              <p className="text-xs text-zinc-500">{thread.length} mensaje{thread.length !== 1 ? 's' : ''}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
              {thread.map((m, i) => {
                const esBot = m.rol === 'bot';
                const prev = thread[i - 1];
                const muestraFecha = !prev ||
                  new Date(m.creado_en).toDateString() !== new Date(prev.creado_en).toDateString();

                return (
                  <div key={m.id}>
                    {muestraFecha && (
                      <div className="text-center my-3">
                        <span className="text-xs text-zinc-600 bg-zinc-900 px-3 py-1 rounded-full">
                          {new Date(m.creado_en).toLocaleDateString('es-AR', {
                            weekday: 'long', day: 'numeric', month: 'long',
                          })}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${esBot ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-sm lg:max-w-md px-3 py-2 rounded-2xl text-sm ${
                        esBot
                          ? 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
                          : 'bg-white text-zinc-900 rounded-tr-sm'
                      }`}>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.contenido}</p>
                        <p className={`text-xs mt-1 ${esBot ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          {formatHora(m.creado_en)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
