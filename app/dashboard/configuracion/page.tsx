'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X, Upload } from 'lucide-react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

type Empleado = { id: number; nombre: string; activo: boolean };
type WspPerfil = { description: string; email: string; website: string; profile_picture_url: string };

export default function ConfiguracionPage() {
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', direccion: '', presentacion: '' });
  const [negocioId, setNegocioId] = useState<number | null>(null);
  const [asignacion, setAsignacion] = useState<'automatica' | 'cliente_elige'>('automatica');
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [nuevoEmpleado, setNuevoEmpleado] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [wsp, setWsp] = useState<WspPerfil>({ description: '', email: '', website: '', profile_picture_url: '' });
  const [isSharedNumber, setIsSharedNumber] = useState(true);
  const [wspLoading, setWspLoading] = useState(false);
  const [wspSuccess, setWspSuccess] = useState('');
  const [wspError, setWspError] = useState('');
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('negocio_id').eq('id', user!.id).single();
      if (!profile?.negocio_id) return;
      setNegocioId(profile.negocio_id);

      const { data: negocio } = await supabase.from('negocios').select('*').eq('id', profile.negocio_id).single();
      if (negocio) {
        setForm({ nombre: negocio.nombre ?? '', email: negocio.email ?? '', telefono: negocio.telefono ?? '', direccion: negocio.direccion ?? '', presentacion: negocio.presentacion ?? '' });
        setAsignacion(negocio.asignacion_empleados ?? 'automatica');
      }

      const { data: emps } = await supabase.from('empleados').select('id, nombre, activo').eq('negocio_id', profile.negocio_id).order('id');
      setEmpleados(emps ?? []);
    }
    cargar();

    fetch('/api/whatsapp/creds')
      .then(r => r.json())
      .then(data => { if (!data.error) setIsSharedNumber(data.isSharedNumber ?? true); })
      .catch(() => {});

    fetch('/api/whatsapp/perfil')
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setWsp({
            description: data.description ?? '',
            email: data.email ?? '',
            website: data.websites?.[0] ?? '',
            profile_picture_url: data.profile_picture_url ?? '',
          });
        }
      })
      .catch(() => {});
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

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function handleWspSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWspLoading(true);
    setWspSuccess('');
    setWspError('');

    try {
      if (fotoFile) {
        const fd = new FormData();
        fd.append('file', fotoFile);
        const fotoRes = await fetch('/api/whatsapp/foto', { method: 'POST', body: fd });
        const fotoData = await fotoRes.json();
        if (!fotoRes.ok) throw new Error(fotoData.error ?? 'Error al subir foto');
        setFotoFile(null);
      }

      const perfilRes = await fetch('/api/whatsapp/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: wsp.description, email: wsp.email, website: wsp.website }),
      });
      const perfilData = await perfilRes.json();
      if (!perfilRes.ok) throw new Error(perfilData.error ?? 'Error al guardar perfil');

      setWspSuccess('Perfil de WhatsApp actualizado.');
      setTimeout(() => setWspSuccess(''), 3000);
    } catch (err: unknown) {
      setWspError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setWspLoading(false);
    }
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

        {/* Presentación del negocio (solo Pro) */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Presentación del negocio</label>
          <textarea
            value={form.presentacion}
            onChange={e => setForm(prev => ({ ...prev, presentacion: e.target.value }))}
            maxLength={500}
            rows={4}
            placeholder="Ej: Somos Peluquería Roma, especialistas en cortes modernos ubicados en Av. Corrientes 1234. Atendemos de lunes a sábado."
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none placeholder-zinc-600"
          />
          <p className="text-xs text-zinc-600 mt-1 text-right">{form.presentacion.length}/500</p>
        </div>

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

      {/* Perfil de WhatsApp */}
      <form onSubmit={handleWspSubmit} className={`bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4 ${isSharedNumber ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-400">Perfil de WhatsApp</p>
          {isSharedNumber && (
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2.5 py-1 rounded-lg">Gestionado por el administrador</span>
          )}
        </div>

        {/* Foto */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center cursor-pointer overflow-hidden hover:border-zinc-500 transition-colors"
          >
            {fotoPreview || wsp.profile_picture_url ? (
              <img src={fotoPreview ?? wsp.profile_picture_url} alt="Foto perfil" className="w-full h-full object-cover" />
            ) : (
              <Upload size={20} className="text-zinc-600" />
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              {fotoPreview ? 'Cambiar imagen' : 'Subir foto de perfil'}
            </button>
            <p className="text-xs text-zinc-600 mt-0.5">JPG o PNG. Se verá en WhatsApp.</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFotoChange} />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción</label>
          <textarea
            value={wsp.description}
            onChange={e => setWsp(prev => ({ ...prev, description: e.target.value }))}
            maxLength={256}
            rows={3}
            placeholder="Describí tu negocio en pocas palabras..."
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none placeholder-zinc-600"
          />
          <p className="text-xs text-zinc-600 mt-1 text-right">{wsp.description.length}/256</p>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
          <input
            type="email"
            value={wsp.email}
            onChange={e => setWsp(prev => ({ ...prev, email: e.target.value }))}
            placeholder="contacto@tunegocio.com"
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 placeholder-zinc-600"
          />
        </div>

        {/* Sitio web */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Sitio web</label>
          <input
            type="url"
            value={wsp.website}
            onChange={e => setWsp(prev => ({ ...prev, website: e.target.value }))}
            placeholder="https://tunegocio.com"
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 placeholder-zinc-600"
          />
        </div>

        {wspError && <p className="text-red-400 text-sm">{wspError}</p>}
        {wspSuccess && <p className="text-green-400 text-sm">{wspSuccess}</p>}

        <button
          type="submit"
          disabled={wspLoading}
          className="bg-white text-zinc-900 rounded-lg py-2 text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {wspLoading ? 'Guardando...' : 'Guardar perfil de WhatsApp'}
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
