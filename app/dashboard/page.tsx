'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

function formatFecha(fecha: string) {
  const d = new Date(fecha + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function SkeletonCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
      <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
      <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
    </div>
  );
}

export default function AgendaPage() {
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowser();

  const today = new Date().toISOString().split('T')[0];
  const in7days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('negocio_id').eq('id', user!.id).single();
      const { data } = await supabase
        .from('reservas')
        .select('*')
        .eq('negocio_id', profile!.negocio_id)
        .gte('fecha', today)
        .lte('fecha', in7days)
        .order('fecha')
        .order('hora');
      setReservas(data ?? []);
      setLoading(false);
    }
    cargar();
  }, []);

  const reservasHoy = reservas.filter(r => r.fecha === today);
  const proximas = reservas.filter(r => r.fecha > today);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Agenda</h1>
        <p className="text-sm text-zinc-500 capitalize">{formatFecha(today)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {loading ? (
          <>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
              <div className="h-8 w-10 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-28 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
              <div className="h-8 w-10 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-28 bg-zinc-800 rounded animate-pulse" />
            </div>
          </>
        ) : (
          <>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-3xl font-bold text-white">{reservasHoy.length}</p>
              <p className="text-sm text-zinc-500 mt-1">Turnos hoy</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-3xl font-bold text-white">{reservas.length}</p>
              <p className="text-sm text-zinc-500 mt-1">Próximos 7 días</p>
            </div>
          </>
        )}
      </div>

      <section>
        <h2 className="font-semibold text-zinc-400 mb-3">Hoy</h2>
        {loading ? (
          <div className="flex flex-col gap-2">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        ) : reservasHoy.length === 0 ? (
          <p className="text-sm text-zinc-600">Sin turnos para hoy.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {reservasHoy.map(r => (
              <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="font-medium text-white">{r.hora.slice(0, 5)} — {r.cliente_nombre}</p>
                <p className="text-sm text-zinc-500">{r.cliente_telefono}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {!loading && proximas.length > 0 && (
        <section>
          <h2 className="font-semibold text-zinc-400 mb-3">Próximos días</h2>
          <div className="flex flex-col gap-2">
            {proximas.map(r => (
              <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="font-medium text-white capitalize">{formatFecha(r.fecha)} — {r.hora.slice(0, 5)}</p>
                <p className="text-sm text-zinc-500">{r.cliente_nombre} · {r.cliente_telefono}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
