'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { Check, Loader2 } from 'lucide-react';

type Negocio = {
  id: number;
  nombre: string;
  email: string;
  plan: string | null;
  plan_vence: string | null;
  mp_suscripcion_estado: string | null;
};

const PLANES = ['trial', 'basico', 'pro'];

function formatFecha(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function BadgePlan({ plan }: { plan: string | null }) {
  const styles: Record<string, string> = {
    trial:  'bg-amber-500/15 text-amber-400',
    basico: 'bg-blue-500/15 text-blue-400',
    pro:    'bg-violet-500/15 text-violet-400',
  };
  const p = plan ?? 'trial';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[p] ?? 'bg-zinc-800 text-zinc-400'}`}>
      {p}
    </span>
  );
}

function BadgeEstado({ estado }: { estado: string | null }) {
  const styles: Record<string, string> = {
    autorizada: 'bg-green-500/15 text-green-400',
    pendiente:  'bg-amber-500/15 text-amber-400',
    cancelada:  'bg-red-500/15 text-red-400',
    pausada:    'bg-orange-500/15 text-orange-400',
    ninguna:    'bg-zinc-800 text-zinc-500',
  };
  const e = estado ?? 'ninguna';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles[e] ?? 'bg-zinc-800 text-zinc-500'}`}>
      MP: {e}
    </span>
  );
}

export default function PlanesAdminPage() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [seleccion, setSeleccion] = useState<Record<number, { plan: string; meses: number }>>({});
  const [mensajes, setMensajes] = useState<Record<number, { texto: string; tipo: 'ok' | 'error' }>>({});
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('negocios')
        .select('id, nombre, email, plan, plan_vence, mp_suscripcion_estado')
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
    setMensajes(prev => ({ ...prev, [negocioId]: { texto: '', tipo: 'ok' } }));
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
        setMensajes(prev => ({ ...prev, [negocioId]: { texto: 'Plan actualizado', tipo: 'ok' } }));
      } else {
        setMensajes(prev => ({ ...prev, [negocioId]: { texto: data.error ?? 'Error', tipo: 'error' } }));
      }
    } catch {
      setMensajes(prev => ({ ...prev, [negocioId]: { texto: 'Error de conexión', tipo: 'error' } }));
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Planes</h1>
        <p className="text-sm text-zinc-500 mt-1">Gestioná los planes de cada negocio</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-zinc-900 rounded-xl animate-pulse" />)}
        </div>
      ) : negocios.length === 0 ? (
        <p className="text-sm text-zinc-600">No hay negocios registrados.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {negocios.map(n => (
            <div key={n.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
              {/* Info del negocio */}
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-semibold">{n.nombre}</p>
                    <BadgePlan plan={n.plan} />
                    <BadgeEstado estado={n.mp_suscripcion_estado} />
                  </div>
                  <p className="text-xs text-zinc-500">{n.email}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Vence: {formatFecha(n.plan_vence)}</p>
                </div>
              </div>

              {/* Controles */}
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Nuevo plan</label>
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

                {mensajes[n.id]?.texto && (
                  <p className={`text-xs ${mensajes[n.id].tipo === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                    {mensajes[n.id].texto}
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
