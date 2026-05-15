'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { Check, Loader2 } from 'lucide-react';

type Negocio = {
  id: number;
  nombre: string;
  plan: string;
  plan_vence: string | null;
  mp_suscripcion_estado: string | null;
};

const PLANES = ['trial', 'basico', 'pro'];

function formatFecha(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function BadgePlan({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    trial:  'bg-amber-500/15 text-amber-400',
    basico: 'bg-blue-500/15 text-blue-400',
    pro:    'bg-violet-500/15 text-violet-400',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[plan] ?? 'bg-zinc-800 text-zinc-400'}`}>
      {plan}
    </span>
  );
}

export default function AdminPage() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [seleccion, setSeleccion] = useState<Record<number, { plan: string; meses: number }>>({});
  const [mensaje, setMensaje] = useState<{ id: number; texto: string; tipo: 'ok' | 'error' } | null>(null);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('negocios')
        .select('id, nombre, plan, plan_vence, mp_suscripcion_estado')
        .order('id');
      setNegocios(data ?? []);
      const init: Record<number, { plan: string; meses: number }> = {};
      (data ?? []).forEach((n: Negocio) => { init[n.id] = { plan: n.plan ?? 'trial', meses: 1 }; });
      setSeleccion(init);
      setLoading(false);
    }
    cargar();
  }, []);

  async function activar(negocioId: number) {
    setGuardando(negocioId);
    setMensaje(null);
    const { plan, meses } = seleccion[negocioId] ?? { plan: 'basico', meses: 1 };
    try {
      const res = await fetch('/api/admin/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negocioId, plan, meses }),
      });
      const data = await res.json();
      if (data.ok) {
        setNegocios(prev => prev.map(n => n.id === negocioId
          ? { ...n, plan, mp_suscripcion_estado: 'autorizada' }
          : n
        ));
        setMensaje({ id: negocioId, texto: 'Plan actualizado correctamente', tipo: 'ok' });
      } else {
        setMensaje({ id: negocioId, texto: data.error ?? 'Error al actualizar', tipo: 'error' });
      }
    } catch {
      setMensaje({ id: negocioId, texto: 'Error de conexión', tipo: 'error' });
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin — Planes</h1>
        <p className="text-sm text-zinc-500 mt-1">Gestioná los planes de los negocios registrados</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map(i => <div key={i} className="h-24 bg-zinc-900 rounded-xl animate-pulse" />)}
        </div>
      ) : negocios.length === 0 ? (
        <p className="text-sm text-zinc-600">No hay negocios registrados.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {negocios.map(n => (
            <div key={n.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold">{n.nombre}</p>
                    <BadgePlan plan={n.plan ?? 'trial'} />
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Vence: {formatFecha(n.plan_vence)} · MP: {n.mp_suscripcion_estado ?? 'ninguna'}
                  </p>
                </div>
              </div>

              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Plan</label>
                  <select
                    value={seleccion[n.id]?.plan ?? 'trial'}
                    onChange={e => setSeleccion(prev => ({ ...prev, [n.id]: { ...prev[n.id], plan: e.target.value } }))}
                    className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  >
                    {PLANES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Duración</label>
                  <select
                    value={seleccion[n.id]?.meses ?? 1}
                    onChange={e => setSeleccion(prev => ({ ...prev, [n.id]: { ...prev[n.id], meses: Number(e.target.value) } }))}
                    className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  >
                    <option value={1}>1 mes</option>
                    <option value={3}>3 meses</option>
                    <option value={6}>6 meses</option>
                    <option value={12}>12 meses</option>
                  </select>
                </div>

                <button
                  onClick={() => activar(n.id)}
                  disabled={guardando === n.id}
                  className="flex items-center gap-2 px-4 py-1.5 bg-white text-zinc-900 rounded-lg text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                >
                  {guardando === n.id
                    ? <><Loader2 size={13} className="animate-spin" /> Guardando…</>
                    : <><Check size={13} /> Activar</>
                  }
                </button>

                {mensaje?.id === n.id && (
                  <p className={`text-xs ${mensaje.tipo === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                    {mensaje.texto}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
