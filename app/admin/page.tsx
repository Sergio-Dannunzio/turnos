import { createSupabaseServer } from '@/lib/supabase-server';
import Link from 'next/link';

export default async function AdminPage() {
  const supabase = await createSupabaseServer();
  const { data: negocios } = await supabase
    .from('negocios')
    .select('*')
    .order('creado_en', { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Negocios</h1>
          <p className="text-sm text-zinc-500">{negocios?.length ?? 0} registrados</p>
        </div>
        <Link
          href="/admin/negocios/nuevo"
          className="bg-white text-zinc-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-colors"
        >
          + Nuevo negocio
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {negocios?.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-16">No hay negocios creados todavía.</p>
        )}
        {negocios?.map(n => (
          <div key={n.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold text-white">{n.nombre}</p>
              <p className="text-sm text-zinc-500">{n.email}</p>
              {n.telefono && <p className="text-sm text-zinc-600">{n.telefono}</p>}
            </div>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-zinc-800 text-zinc-400">
              {n.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
