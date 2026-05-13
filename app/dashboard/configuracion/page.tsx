'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

export default function ConfiguracionPage() {
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', direccion: '' });
  const [negocioId, setNegocioId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('negocio_id').eq('id', user!.id).single();
      if (!profile?.negocio_id) return;
      setNegocioId(profile.negocio_id);
      const { data: negocio } = await supabase.from('negocios').select('*').eq('id', profile.negocio_id).single();
      if (negocio) setForm({ nombre: negocio.nombre ?? '', email: negocio.email ?? '', telefono: negocio.telefono ?? '', direccion: negocio.direccion ?? '' });
    }
    cargar();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!negocioId) return;
    setLoading(true);
    setSuccess(false);
    await supabase.from('negocios').update(form).eq('id', negocioId);
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-sm text-zinc-500">Datos de tu negocio.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
        {[
          { name: 'nombre', label: 'Nombre del negocio' },
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'telefono', label: 'Teléfono' },
          { name: 'direccion', label: 'Dirección' },
        ].map(field => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-zinc-400 mb-1">{field.label}</label>
            <input
              type={field.type || 'text'}
              value={form[field.name as keyof typeof form]}
              onChange={e => setForm(prev => ({ ...prev, [field.name]: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>
        ))}
        {success && <p className="text-green-400 text-sm">Cambios guardados.</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-white text-zinc-900 rounded-lg py-2 text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
