'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

function SkeletonCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-36 bg-zinc-800 rounded animate-pulse" />
        <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
      </div>
      <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
    </div>
  );
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('negocio_id').eq('id', user!.id).single();
      const { data: reservas } = await supabase
        .from('reservas')
        .select('cliente_nombre, cliente_telefono, fecha')
        .eq('negocio_id', profile!.negocio_id)
        .order('fecha', { ascending: false });

      const map = new Map<string, { nombre: string; telefono: string; visitas: number; ultima: string }>();
      for (const r of reservas ?? []) {
        if (map.has(r.cliente_telefono)) {
          const c = map.get(r.cliente_telefono)!;
          c.visitas++;
          if (r.fecha > c.ultima) c.ultima = r.fecha;
        } else {
          map.set(r.cliente_telefono, { nombre: r.cliente_nombre, telefono: r.cliente_telefono, visitas: 1, ultima: r.fecha });
        }
      }

      setClientes(Array.from(map.values()).sort((a, b) => b.ultima.localeCompare(a.ultima)));
      setLoading(false);
    }
    cargar();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Clientes</h1>
        <p className="text-sm text-zinc-500">{loading ? '...' : `${clientes.length} en el historial`}</p>
      </div>

      <div className="flex flex-col gap-2">
        {loading ? (
          [1,2,3,4,5].map(i => <SkeletonCard key={i} />)
        ) : clientes.length === 0 ? (
          <p className="text-sm text-zinc-600">Aún no hay clientes registrados.</p>
        ) : (
          clientes.map(c => (
            <div key={c.telefono} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-white">{c.nombre}</p>
                <p className="text-sm text-zinc-500">{c.telefono}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-zinc-300">{c.visitas} {c.visitas === 1 ? 'turno' : 'turnos'}</p>
                <p className="text-xs text-zinc-600">Último: {c.ultima}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
