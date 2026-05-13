'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NuevoNegocioPage() {
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', direccion: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/admin/negocios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Error al crear el negocio.');
      setLoading(false);
      return;
    }

    router.push('/admin');
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-lg mx-auto">
        <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-300 mb-6 inline-block transition-colors">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-white mb-6">Nuevo negocio</h1>
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
          {[
            { name: 'nombre', label: 'Nombre del negocio', required: true },
            { name: 'email', label: 'Email (para el login)', type: 'email', required: true },
            { name: 'password', label: 'Contraseña inicial', type: 'password', required: true },
            { name: 'telefono', label: 'Teléfono', required: false },
            { name: 'direccion', label: 'Dirección', required: false },
          ].map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                {field.label} {field.required && <span className="text-zinc-600">*</span>}
              </label>
              <input
                type={field.type || 'text'}
                name={field.name}
                value={form[field.name as keyof typeof form]}
                onChange={handleChange}
                required={field.required}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>
          ))}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-white text-zinc-900 rounded-lg py-2 text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creando...' : 'Crear negocio'}
          </button>
        </form>
      </div>
    </main>
  );
}
