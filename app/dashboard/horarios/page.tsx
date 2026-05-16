'use client';

import { useState, useEffect } from 'react';
import { Plus, X, User } from 'lucide-react';

type Empleado = { id: number; nombre: string; activo: boolean };

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const HORAS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

const INTERVALOS = [
  { label: '15 min', value: 15 },
  { label: '20 min', value: 20 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hora', value: 60 },
  { label: '1:30 hs', value: 90 },
  { label: '2 horas', value: 120 },
];

type Lapso = { desde: string; hasta: string };

function toMinutes(hora: string) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

function detectarConfig(horarios: { dia_semana: string; hora: string }[]) {
  if (horarios.length === 0) return null;

  const diasPresentes = new Set(horarios.map(h => h.dia_semana));
  const dias = DIAS.filter(d => diasPresentes.has(d));

  const primerDia = dias[0];
  const slotsDia = horarios
    .filter(h => h.dia_semana === primerDia)
    .map(h => toMinutes(h.hora))
    .sort((a, b) => a - b);

  if (slotsDia.length === 0) return null;

  const intervalo = slotsDia.length > 1 ? slotsDia[1] - slotsDia[0] : 60;

  // Detectar lapsos buscando huecos mayores al intervalo
  const lapsos: Lapso[] = [];
  let inicio = slotsDia[0];
  for (let i = 1; i < slotsDia.length; i++) {
    if (slotsDia[i] - slotsDia[i - 1] > intervalo) {
      lapsos.push({ desde: fromMinutes(inicio), hasta: fromMinutes(slotsDia[i - 1] + intervalo) });
      inicio = slotsDia[i];
    }
  }
  lapsos.push({ desde: fromMinutes(inicio), hasta: fromMinutes(slotsDia[slotsDia.length - 1] + intervalo) });

  return { dias, lapsos, intervalo };
}

export default function HorariosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadoId, setEmpleadoId] = useState<number | null>(null);
  const [dias, setDias] = useState<string[]>(['lunes', 'martes', 'miercoles', 'jueves', 'viernes']);
  const [lapsos, setLapsos] = useState<Lapso[]>([{ desde: '09:00', hasta: '18:00' }]);
  const [intervalo, setIntervalo] = useState(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/horarios')
      .then(r => r.json())
      .then(data => {
        const activos = (data.empleados ?? []).filter((e: Empleado) => e.activo);
        setEmpleados(activos);
        if (activos.length > 0) {
          setEmpleadoId(activos[0].id);
          const config = detectarConfig((data.horarios ?? []).filter((h: any) => h.empleado_id === activos[0].id));
          if (config) { setDias(config.dias); setLapsos(config.lapsos); setIntervalo(config.intervalo); }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!empleadoId) return;
    setLoading(true);
    fetch(`/api/dashboard/horarios?empleadoId=${empleadoId}`)
      .then(r => r.json())
      .then(data => {
        const config = detectarConfig(data.horarios ?? []);
        if (config) { setDias(config.dias); setLapsos(config.lapsos); setIntervalo(config.intervalo); }
        else { setDias(['lunes', 'martes', 'miercoles', 'jueves', 'viernes']); setLapsos([{ desde: '09:00', hasta: '18:00' }]); setIntervalo(60); }
      })
      .finally(() => setLoading(false));
  }, [empleadoId]);

  function toggleDia(dia: string) {
    setExito(false);
    setDias(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]);
  }

  function agregarLapso() {
    setExito(false);
    const ultimo = lapsos[lapsos.length - 1];
    const nuevoDesde = ultimo ? ultimo.hasta : '09:00';
    setLapsos(prev => [...prev, { desde: nuevoDesde, hasta: nuevoDesde }]);
  }

  function quitarLapso(idx: number) {
    setExito(false);
    setLapsos(prev => prev.filter((_, i) => i !== idx));
  }

  function actualizarLapso(idx: number, campo: keyof Lapso, valor: string) {
    setExito(false);
    setLapsos(prev => prev.map((l, i) => i === idx ? { ...l, [campo]: valor } : l));
  }

  function generarPreview() {
    const slots: { dia_semana: string; hora: string }[] = [];
    for (const dia of dias) {
      for (const lapso of lapsos) {
        const inicioMin = toMinutes(lapso.desde);
        const finMin = toMinutes(lapso.hasta);
        for (let min = inicioMin; min < finMin; min += intervalo) {
          slots.push({ dia_semana: dia, hora: fromMinutes(min) });
        }
      }
    }
    return slots;
  }

  const preview = generarPreview();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setExito(false);
    if (dias.length === 0) { setError('Seleccioná al menos un día.'); return; }
    if (preview.length === 0) { setError('Los lapsos definidos no generaron turnos válidos.'); return; }

    setSaving(true);
    setError('');

    const res = await fetch('/api/dashboard/horarios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ horarios: preview, empleadoId }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Error al guardar los horarios.');
      return;
    }

    setExito(true);
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto flex flex-col gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Horarios de atención</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Modificá los días y horarios en los que recibís turnos. Los cambios reemplazan la configuración anterior.
      </p>

      {empleados.length > 1 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3 mb-4">
          <User size={15} className="text-zinc-500 shrink-0" />
          <select
            value={empleadoId ?? ''}
            onChange={e => setEmpleadoId(Number(e.target.value))}
            className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm"
          >
            {empleados.map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>
      )}

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
          <p className="font-medium text-zinc-300">Lapsos de atención</p>
          <div className="flex flex-col gap-3">
            {lapsos.map((lapso, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Desde</label>
                    <select
                      value={lapso.desde}
                      onChange={e => actualizarLapso(idx, 'desde', e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm"
                    >
                      {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Hasta</label>
                    <select
                      value={lapso.hasta}
                      onChange={e => actualizarLapso(idx, 'hasta', e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm"
                    >
                      {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
                {lapsos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => quitarLapso(idx)}
                    className="p-2 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={agregarLapso}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors w-fit"
          >
            <Plus size={14} />
            Agregar lapso
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
          <p className="font-medium text-zinc-300">Duración de cada turno</p>
          <div className="flex flex-wrap gap-2">
            {INTERVALOS.map(op => (
              <button
                key={op.value}
                type="button"
                onClick={() => { setExito(false); setIntervalo(op.value); }}
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

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-400">
          Se van a generar{' '}
          <span className="text-white font-semibold">{preview.length} turnos</span> por semana.
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-500">
          Las reservas ya registradas <span className="text-zinc-300">no se modifican</span> al cambiar los horarios.
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {exito && <p className="text-green-400 text-sm">Horarios actualizados correctamente.</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-white text-zinc-900 rounded-lg py-2.5 font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
