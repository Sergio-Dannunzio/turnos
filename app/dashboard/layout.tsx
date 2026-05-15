import { createSupabaseServer } from '@/lib/supabase-server';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  let negocioNombre = 'Mi negocio';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('negocio_id')
      .eq('id', user.id)
      .single();

    if (profile?.negocio_id) {
      const { data: negocio } = await supabase
        .from('negocios')
        .select('nombre')
        .eq('id', profile.negocio_id)
        .single();
      if (negocio) negocioNombre = negocio.nombre;
    }
  }

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar negocioNombre={negocioNombre} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:p-8">{children}</div>
      </main>
    </div>
  );
}
