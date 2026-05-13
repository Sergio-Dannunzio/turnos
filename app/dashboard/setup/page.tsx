'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const HORAS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
const INTERVALOS = [{ label: '30 minutos', value: 30 }, { label: '1 hora', value: 60 }];

export default function SetupPage() {
  const [dias, setDias] = useState<string[]>(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('18:00');
  const [intervalo, setIntervalo] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  function toggleDia(dia: string) {
    setDias(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]);
  }

  function generarHorarios() {
    const slots: { dia_semana: string; hora: string }[] = [];
    const [hI, mI] = horaInicio.split(':').map(Number);
    const [hF, mF] = horaFin.split(':').map(Number);
    const inicioMin = hI * 60 + mI;
    const finMin = hF * 60 + mF;

    for (const dia of dias) {
      for (let min = inicioMin; min < finMin; min += intervalo) {
        const h = String(Math.floor(min / 60)).padStart(2, '0');
        const m = String(min % 60).padStart(2, '0');
        slots.push({ dia_semana: dia, hora: `${h}:${m}` });
      }
    }
    return slots;
  }

  const preview = generarHorarios();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (dias.length === 0) { setError('Seleccioná al menos un día.'); return; }
    if (preview.length === 0) { setError('El rango de horarios no generó turnos válidos.'); return; }

    setLoading(true);
    setError('');

    const res = await fetch('/api/dashboard/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ horarios: preview }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Error al guardar la configuración.');
      setLoading(false);
      return;
    }

    router.refresh();
    router.push('/dashboard');
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Configuración inicial</h1>
      <p className="text-sm text-zinc-500 mb-6">Definí tu horario de atención. Podés modificarlo después.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
          <p className="font-medium text-zinc-300">Días de atención</p>
          <div className="flex flex-wrap gap-2">
            {DIAS.map(dia => (
              <button
                key={dia}
                type="button"
                onClick={() => toggleDia(dia)}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                  dias.includes(dia)
                    ? 'bg-white text-zinc-900 font-medium'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                {dia}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
          <p className="font-medium text-zinc-300">Horario</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Desde', value: horaInicio, onChange: setHoraInicio },
              { label: 'Hasta', value: horaFin, onChange: setHoraFin },
            ].map(({ label, value, onChange }) => (
              <div key={label}>
                <label className="block text-sm text-zinc-500 mb-1">{label}</label>
                <select
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm"
                >
                  {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm text-zinc-500 mb-2">Duración de cada turno</label>
            <div className="flex gap-2">
              {INTERVALOS.map(op => (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => setIntervalo(op.value)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    intervalo === op.value
                      ? 'bg-white text-zinc-900 font-medium'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-400">
          Se van a crear <span className="text-white font-semibold">{preview.length} turnos</span> por semana.
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-white text-zinc-900 rounded-lg py-2.5 font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Guardando...' : 'Guardar y continuar'}
        </button>
      </form>
    </div>
  );
}
