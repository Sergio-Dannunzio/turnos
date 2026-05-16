'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

type Empleado = { id: number; nombre: string; activo: boolean };

export default function ConfiguracionPage() {
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', direccion: '' });
  const [negocioId, setNegocioId] = useState<number | null>(null);
  const [asignacion, setAsignacion] = useState<'automatica' | 'cliente_elige'>('automatica');
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [nuevoEmpleado, setNuevoEmpleado] = useState('');
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
      if (negocio) {
        setForm({ nombre: negocio.nombre ?? '', email: negocio.email ?? '', telefono: negocio.telefono ?? '', direccion: negocio.direccion ?? '' });
        setAsignacion(negocio.asignacion_empleados ?? 'automatica');
      }

      const { data: emps } = await supabase.from('empleados').select('id, nombre, activo').eq('negocio_id', profile.negocio_id).order('id');
      setEmpleados(emps ?? []);
    }
    cargar();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!negocioId) return;
    setLoading(true);
    setSuccess(false);
    await supabase.from('negocios').update({ ...form, asignacion_empleados: asignacion }).eq('id', negocioId);
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  async function agregarEmpleado() {
    if (!negocioId || !nuevoEmpleado.trim()) return;
    const { data } = await supabase.from('empleados').insert({ negocio_id: negocioId, nombre: nuevoEmpleado.trim() }).select().single();
    if (data) setEmpleados(prev => [...prev, data]);
    setNuevoEmpleado('');
  }

  async function toggleEmpleado(id: number, activo: boolean) {
    await supabase.from('empleados').update({ activo: !activo }).eq('id', id);
    setEmpleados(prev => prev.map(e => e.id === id ? { ...e, activo: !activo } : e));
  }

  async function eliminarEmpleado(id: number) {
    if (!confirm('¿Eliminar este empleado? Sus horarios también se eliminarán.')) return;
    await supabase.from('empleados').delete().eq('id', id);
    setEmpleados(prev => prev.filter(e => e.id !== id));
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-sm text-zinc-500">Datos y preferencias de tu negocio.</p>
      </div>

      {/* Datos del negocio */}
      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
        <p className="text-sm font-medium text-zinc-400">Datos del negocio</p>
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

        {/* Asignación de empleados */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Asignación de empleados</label>
          <div className="flex flex-col gap-2">
            {[
              { value: 'automatica', label: 'Automática', desc: 'El bot asigna al primer empleado disponible' },
              { value: 'cliente_elige', label: 'El cliente elige', desc: 'El bot pregunta con quién quiere el turno' },
            ].map(op => (
              <label key={op.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="asignacion"
                  value={op.value}
                  checked={asignacion === op.value}
                  onChange={() => setAsignacion(op.value as 'automatica' | 'cliente_elige')}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm text-white">{op.label}</p>
                  <p className="text-xs text-zinc-500">{op.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {success && <p className="text-green-400 text-sm">Cambios guardados.</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-white text-zinc-900 rounded-lg py-2 text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      {/* Empleados */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
        <p className="text-sm font-medium text-zinc-400">Empleados</p>

        <div className="flex flex-col gap-2">
          {empleados.map(e => (
            <div key={e.id} className="flex items-center justify-between gap-3 py-2 border-b border-zinc-800 last:border-0">
              <span className={`text-sm ${e.activo ? 'text-white' : 'text-zinc-600 line-through'}`}>{e.nombre}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleEmpleado(e.id, e.activo)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  {e.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => eliminarEmpleado(e.id)}
                  className="p-1.5 text-zinc-700 hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={nuevoEmpleado}
            onChange={e => setNuevoEmpleado(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarEmpleado())}
            placeholder="Nombre del empleado"
            className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 placeholder-zinc-600"
          />
          <button
            onClick={agregarEmpleado}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-700 text-white rounded-lg text-sm hover:bg-zinc-600 transition-colors"
          >
            <Plus size={14} />
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
