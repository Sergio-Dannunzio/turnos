'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { ChevronLeft, ChevronRight, Plus, X, Star } from 'lucide-react';
import type { Bloqueo } from '@/lib/types';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_ES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

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
type GrupoBloqueo = { desde: string; hasta: string; ids: number[] };

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function toMinutes(hora: string) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

function agruparBloqueos(bloqueos: Bloqueo[]): GrupoBloqueo[] {
  const conHora = bloqueos
    .filter(b => b.hora)
    .map(b => ({ id: b.id, hora: b.hora!.slice(0, 5), min: toMinutes(b.hora!.slice(0, 5)) }))
    .sort((a, b) => a.min - b.min);
  if (conHora.length === 0) return [];
  const grupos: GrupoBloqueo[] = [];
  let actual = { desde: conHora[0].hora, hasta: conHora[0].hora, ids: [conHora[0].id], minUltimo: conHora[0].min };
  for (let i = 1; i < conHora.length; i++) {
    if (conHora[i].min - actual.minUltimo <= 60) {
      actual.hasta = conHora[i].hora;
      actual.ids.push(conHora[i].id);
      actual.minUltimo = conHora[i].min;
    } else {
      grupos.push({ desde: actual.desde, hasta: actual.hasta, ids: actual.ids });
      actual = { desde: conHora[i].hora, hasta: conHora[i].hora, ids: [conHora[i].id], minUltimo: conHora[i].min };
    }
  }
  grupos.push({ desde: actual.desde, hasta: actual.hasta, ids: actual.ids });
  return grupos;
}

function agruparHoras(horas: string[]): { desde: string; hasta: string }[] {
  if (horas.length === 0) return [];
  const sorted = [...horas].sort();
  const mins = sorted.map(toMinutes);
  const intervalo = mins.length > 1 ? mins[1] - mins[0] : 60;
  const grupos: { desde: string; hasta: string }[] = [];
  let inicio = sorted[0];
  let ultimoMin = mins[0];
  for (let i = 1; i < sorted.length; i++) {
    if (mins[i] - ultimoMin > intervalo) {
      grupos.push({ desde: inicio, hasta: fromMinutes(ultimoMin + intervalo) });
      inicio = sorted[i];
    }
    ultimoMin = mins[i];
  }
  grupos.push({ desde: inicio, hasta: fromMinutes(ultimoMin + intervalo) });
  return grupos;
}

function detectarConfigEspecial(horas: string[]) {
  if (horas.length === 0) return { lapsos: [{ desde: '09:00', hasta: '13:00' }], intervalo: 60 };
  const sorted = [...horas].sort();
  const mins = sorted.map(toMinutes);
  const intervalo = mins.length > 1 ? mins[1] - mins[0] : 60;
  const lapsos: Lapso[] = [];
  let inicio = sorted[0];
  let ultimoMin = mins[0];
  for (let i = 1; i < sorted.length; i++) {
    if (mins[i] - ultimoMin > intervalo) {
      lapsos.push({ desde: inicio, hasta: fromMinutes(ultimoMin + intervalo) });
      inicio = sorted[i];
    }
    ultimoMin = mins[i];
  }
  lapsos.push({ desde: inicio, hasta: fromMinutes(ultimoMin + intervalo) });
  return { lapsos, intervalo };
}

export default function BloqueosPage() {
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [negocioId, setNegocioId] = useState<number | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [horariosDelDia, setHorariosDelDia] = useState<string[]>([]);
  const [lapsos, setLapsos] = useState<Lapso[]>([{ desde: '09:00', hasta: '13:00' }]);
  const [loading, setLoading] = useState(false);
  const [diasLaborables, setDiasLaborables] = useState<Set<string>>(new Set());
  const [diasConEspecial, setDiasConEspecial] = useState<Set<string>>(new Set());

  // Estado día especial
  const [slotsEspeciales, setSlotsEspeciales] = useState<string[]>([]);
  const [lapsosEspeciales, setLapsosEspeciales] = useState<Lapso[]>([{ desde: '09:00', hasta: '13:00' }]);
  const [intervaloEspecial, setIntervaloEspecial] = useState(60);
  const [editandoEspecial, setEditandoEspecial] = useState(false);
  const [errorEspecial, setErrorEspecial] = useState('');

  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('negocio_id').eq('id', user!.id).single();
      const nId = profile!.negocio_id;
      setNegocioId(nId);

      const [{ data: blqs }, { data: horarios }, { data: especiales }] = await Promise.all([
        supabase.from('bloqueos').select('*').eq('negocio_id', nId).order('fecha'),
        supabase.from('horarios').select('dia_semana').eq('negocio_id', nId).eq('activo', true),
        supabase.from('dias_especiales').select('fecha').eq('negocio_id', nId),
      ]);

      setBloqueos(blqs ?? []);
      setDiasLaborables(new Set(horarios?.map(h => h.dia_semana) ?? []));
      setDiasConEspecial(new Set(especiales?.map(e => e.fecha) ?? []));
    }
    init();
  }, []);

  async function cargar(id?: number) {
    const nId = id ?? negocioId;
    if (!nId) return;
    const { data } = await supabase.from('bloqueos').select('*').eq('negocio_id', nId).order('fecha');
    setBloqueos(data ?? []);
  }

  async function cargarHorarios(dateStr: string, nId: number) {
    const diaSemana = DIAS_ES[new Date(dateStr + 'T12:00:00').getDay()];
    const { data } = await supabase
      .from('horarios').select('hora')
      .eq('negocio_id', nId).eq('dia_semana', diaSemana).eq('activo', true).order('hora');
    setHorariosDelDia(data?.map(h => h.hora.slice(0, 5)) ?? []);
  }

  async function cargarEspeciales(dateStr: string, nId: number) {
    const { data } = await supabase
      .from('dias_especiales').select('hora')
      .eq('negocio_id', nId).eq('fecha', dateStr).order('hora');
    const slots = data?.map(d => d.hora.slice(0, 5)) ?? [];
    setSlotsEspeciales(slots);
    return slots;
  }

  async function handleSelectDate(dateStr: string) {
    if (selectedDate === dateStr) {
      setSelectedDate(null);
      setHorariosDelDia([]);
      setLapsos([{ desde: '09:00', hasta: '13:00' }]);
      setSlotsEspeciales([]);
      setEditandoEspecial(false);
      return;
    }
    setSelectedDate(dateStr);
    setLapsos([{ desde: '09:00', hasta: '13:00' }]);
    setEditandoEspecial(false);
    const diaSemana = DIAS_ES[new Date(dateStr + 'T12:00:00').getDay()];
    const esLaborable = diasLaborables.has(diaSemana);
    if (negocioId) {
      if (esLaborable) {
        await cargarHorarios(dateStr, negocioId);
      } else {
        await cargarEspeciales(dateStr, negocioId);
      }
    }
  }

  // Lapsos bloqueos (días laborables)
  function agregarLapso() {
    const ultimo = lapsos[lapsos.length - 1];
    setLapsos(prev => [...prev, { desde: ultimo?.hasta ?? '09:00', hasta: ultimo?.hasta ?? '13:00' }]);
  }
  function quitarLapso(idx: number) { setLapsos(prev => prev.filter((_, i) => i !== idx)); }
  function actualizarLapso(idx: number, campo: keyof Lapso, valor: string) {
    setLapsos(prev => prev.map((l, i) => i === idx ? { ...l, [campo]: valor } : l));
  }

  // Lapsos especiales (días no laborables)
  function agregarLapsoEspecial() {
    const ultimo = lapsosEspeciales[lapsosEspeciales.length - 1];
    setLapsosEspeciales(prev => [...prev, { desde: ultimo?.hasta ?? '09:00', hasta: ultimo?.hasta ?? '13:00' }]);
  }
  function quitarLapsoEspecial(idx: number) { setLapsosEspeciales(prev => prev.filter((_, i) => i !== idx)); }
  function actualizarLapsoEspecial(idx: number, campo: keyof Lapso, valor: string) {
    setLapsosEspeciales(prev => prev.map((l, i) => i === idx ? { ...l, [campo]: valor } : l));
  }

  function habilitarFormEspecial(editar = false) {
    if (editar && slotsEspeciales.length > 0) {
      const { lapsos: l, intervalo: iv } = detectarConfigEspecial(slotsEspeciales);
      setLapsosEspeciales(l);
      setIntervaloEspecial(iv);
    } else {
      setLapsosEspeciales([{ desde: '09:00', hasta: '13:00' }]);
      setIntervaloEspecial(60);
    }
    setEditandoEspecial(true);
  }

  function generarSlotsEspeciales() {
    const slots: string[] = [];
    for (const lapso of lapsosEspeciales) {
      const ini = toMinutes(lapso.desde);
      const fin = toMinutes(lapso.hasta);
      for (let min = ini; min < fin; min += intervaloEspecial) {
        slots.push(fromMinutes(min));
      }
    }
    return slots;
  }

  async function guardarEspeciales() {
    if (!negocioId || !selectedDate) return;
    setLoading(true);
    setErrorEspecial('');
    const slots = generarSlotsEspeciales();

    const { error: delError } = await supabase
      .from('dias_especiales').delete()
      .eq('negocio_id', negocioId).eq('fecha', selectedDate);

    if (delError) {
      setErrorEspecial(`Error al limpiar: ${delError.message}`);
      setLoading(false);
      return;
    }

    if (slots.length > 0) {
      const { error: insError } = await supabase.from('dias_especiales').insert(
        slots.map(hora => ({ negocio_id: negocioId, fecha: selectedDate, hora }))
      );
      if (insError) {
        setErrorEspecial(`Error al guardar: ${insError.message}`);
        setLoading(false);
        return;
      }
    }

    const nuevos = await cargarEspeciales(selectedDate, negocioId);
    setDiasConEspecial(prev => {
      const s = new Set(prev);
      if (nuevos.length > 0) s.add(selectedDate); else s.delete(selectedDate);
      return s;
    });
    setEditandoEspecial(false);
    setLoading(false);
  }

  async function eliminarEspeciales() {
    if (!negocioId || !selectedDate) return;
    setLoading(true);
    await supabase.from('dias_especiales').delete().eq('negocio_id', negocioId).eq('fecha', selectedDate);
    setSlotsEspeciales([]);
    setDiasConEspecial(prev => { const s = new Set(prev); s.delete(selectedDate!); return s; });
    setLoading(false);
  }

  async function guardarLapsos() {
    if (!negocioId || !selectedDate) return;
    setLoading(true);
    const horasABloquear = horariosDelDia.filter(hora => {
      const min = toMinutes(hora);
      return lapsos.some(l => min >= toMinutes(l.desde) && min < toMinutes(l.hasta));
    });
    const yaBloquead = bloqueos.filter(b => b.fecha === selectedDate && b.hora).map(b => b.hora!.slice(0, 5));
    const nuevas = horasABloquear.filter(h => !yaBloquead.includes(h));
    for (const hora of nuevas) {
      await supabase.from('bloqueos').insert({ negocio_id: negocioId, fecha: selectedDate, hora });
    }
    await cargar();
    setLoading(false);
  }

  async function eliminarGrupo(ids: number[]) {
    for (const id of ids) await supabase.from('bloqueos').delete().eq('id', id);
    await cargar();
  }

  async function eliminarBloqueoTotal(id: number) {
    await supabase.from('bloqueos').delete().eq('id', id);
    await cargar();
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = new Date().toISOString().split('T')[0];

  const isFullyBlocked = (d: string) => bloqueos.some(b => b.fecha === d && !b.hora);
  const isPartialBlocked = (d: string) => bloqueos.some(b => b.fecha === d && b.hora);

  const bloqueosDelDia = selectedDate ? bloqueos.filter(b => b.fecha === selectedDate) : [];
  const gruposDelDia = agruparBloqueos(bloqueosDelDia);
  const bloqueoTotal = bloqueosDelDia.find(b => !b.hora);
  const tieneBloqueoTotal = !!bloqueoTotal;

  const esDiaLaborable = selectedDate
    ? diasLaborables.has(DIAS_ES[new Date(selectedDate + 'T12:00:00').getDay()])
    : true;

  const gruposEspeciales = agruparHoras(slotsEspeciales);
  const previewEspecial = generarSlotsEspeciales();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Bloqueos</h1>
        <p className="text-sm text-zinc-500">Seleccioná un día para bloquearlo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

        {/* Calendario */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold">{MESES[month]} {year}</h2>
            <div className="flex gap-1">
              <button onClick={() => setViewDate(new Date(year, month - 1))} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setViewDate(new Date(year, month + 1))} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-center text-xs text-zinc-600 pb-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = toDateStr(year, month, day);
              const fullyBlocked = isFullyBlocked(dateStr);
              const partialBlocked = isPartialBlocked(dateStr);
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === today;
              const diaSemana = DIAS_ES[new Date(dateStr + 'T12:00:00').getDay()];
              const esLaborable = diasLaborables.has(diaSemana);
              const tieneEspecial = diasConEspecial.has(dateStr);

              return (
                <button
                  key={day}
                  onClick={() => handleSelectDate(dateStr)}
                  className={`
                    relative aspect-square flex items-center justify-center rounded-lg text-sm transition-all
                    ${isSelected ? 'bg-white text-zinc-900 font-bold'
                      : fullyBlocked ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : partialBlocked ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                      : tieneEspecial ? 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
                      : esLaborable ? 'text-zinc-300 hover:bg-zinc-800'
                      : 'text-zinc-600 hover:bg-zinc-800/50'}
                  `}
                >
                  {day}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                  )}
                  {!isSelected && !fullyBlocked && !partialBlocked && !tieneEspecial && (
                    <span className={`absolute top-1 right-1 w-1 h-1 rounded-full ${esLaborable ? 'bg-green-500' : 'bg-red-500'}`} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-500"><div className="w-3 h-3 rounded bg-red-500/20" /> Día completo</div>
            <div className="flex items-center gap-2 text-xs text-zinc-500"><div className="w-3 h-3 rounded bg-yellow-500/10" /> Parcial</div>
            <div className="flex items-center gap-2 text-xs text-zinc-500"><div className="w-3 h-3 rounded bg-blue-500/10" /> Día especial</div>
            <div className="flex items-center gap-2 text-xs text-zinc-500"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 mx-0.5" /> Hoy</div>
            <div className="flex items-center gap-2 text-xs text-zinc-500"><div className="w-1.5 h-1.5 rounded-full bg-green-500 mx-0.5" /> Laborable</div>
            <div className="flex items-center gap-2 text-xs text-zinc-500"><div className="w-1.5 h-1.5 rounded-full bg-red-500 mx-0.5" /> No laborable</div>
          </div>
        </div>

        {/* Panel lateral */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
          {!selectedDate ? (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <p className="text-sm text-zinc-600 text-center">Seleccioná un día en el calendario.</p>
            </div>
          ) : (
            <>
              <div>
                <p className="font-semibold text-white">{selectedDate}</p>
                <p className={`text-xs mt-0.5 ${esDiaLaborable ? 'text-zinc-500' : slotsEspeciales.length > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {esDiaLaborable ? 'Configurá los bloqueos del día' : slotsEspeciales.length > 0 ? 'Día especial habilitado' : 'Día no laborable'}
                </p>
              </div>

              {/* ── DÍA LABORABLE ── */}
              {esDiaLaborable && (
                <>
                  {bloqueosDelDia.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-zinc-500 font-medium">Bloqueado</p>
                      {bloqueoTotal && (
                        <div className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-1.5">
                          <span className="text-sm text-zinc-300">Día completo</span>
                          <button onClick={() => eliminarBloqueoTotal(bloqueoTotal.id)} className="text-zinc-600 hover:text-red-400 transition-colors"><X size={13} /></button>
                        </div>
                      )}
                      {gruposDelDia.map((grupo, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-1.5">
                          <span className="text-sm text-zinc-300">
                            {grupo.desde === grupo.hasta ? `${grupo.desde} hs` : `${grupo.desde} – ${grupo.hasta} hs`}
                          </span>
                          <button onClick={() => eliminarGrupo(grupo.ids)} className="text-zinc-600 hover:text-red-400 transition-colors"><X size={13} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!tieneBloqueoTotal && (
                    <div className="flex flex-col gap-4 border-t border-zinc-800 pt-4">
                      <button
                        onClick={async () => {
                          if (!negocioId || !selectedDate) return;
                          setLoading(true);
                          await supabase.from('bloqueos').insert({ negocio_id: negocioId, fecha: selectedDate, hora: null });
                          await cargar();
                          setLoading(false);
                        }}
                        disabled={loading}
                        className="w-full py-2 rounded-lg text-sm font-medium border border-zinc-700 text-zinc-400 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 transition-colors"
                      >
                        Bloquear día completo
                      </button>

                      <div className="flex flex-col gap-3">
                        <p className="text-xs text-zinc-500 font-medium">O bloqueá por lapso</p>
                        {lapsos.map((lapso, idx) => (
                          <div key={idx} className="flex items-end gap-2">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-zinc-600 mb-1">Desde</label>
                                <select value={lapso.desde} onChange={e => actualizarLapso(idx, 'desde', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs">
                                  {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-zinc-600 mb-1">Hasta</label>
                                <select value={lapso.hasta} onChange={e => actualizarLapso(idx, 'hasta', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs">
                                  {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                              </div>
                            </div>
                            {lapsos.length > 1 && (
                              <button type="button" onClick={() => quitarLapso(idx)} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800">
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={agregarLapso} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors w-fit">
                          <Plus size={13} /> Agregar lapso
                        </button>
                      </div>

                      <button onClick={guardarLapsos} disabled={loading} className="w-full bg-white text-zinc-900 rounded-lg py-2 text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors">
                        {loading ? 'Guardando...' : 'Guardar bloqueos'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ── DÍA NO LABORABLE ── */}
              {!esDiaLaborable && (
                <>
                  {/* Slots especiales existentes */}
                  {slotsEspeciales.length > 0 && !editandoEspecial && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-zinc-500 font-medium">Turnos habilitados</p>
                      {gruposEspeciales.map((g, i) => (
                        <div key={i} className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 text-sm text-blue-300">
                          {g.desde} – {g.hasta} hs
                        </div>
                      ))}
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => habilitarFormEspecial(true)} className="flex-1 py-1.5 rounded-lg text-xs border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
                          Editar
                        </button>
                        <button onClick={eliminarEspeciales} disabled={loading} className="flex-1 py-1.5 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors">
                          Quitar día especial
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sin especial, sin form */}
                  {slotsEspeciales.length === 0 && !editandoEspecial && (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-zinc-600 text-center py-2">
                        Este día no tiene horarios configurados.
                      </p>
                      <button
                        onClick={() => habilitarFormEspecial(false)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors"
                      >
                        <Star size={14} /> Habilitar día especial
                      </button>
                    </div>
                  )}

                  {/* Formulario especial */}
                  {editandoEspecial && (
                    <div className="flex flex-col gap-4 border-t border-zinc-800 pt-4">
                      <p className="text-xs text-zinc-400 font-medium">Lapsos de atención</p>
                      {lapsosEspeciales.map((lapso, idx) => (
                        <div key={idx} className="flex items-end gap-2">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-zinc-600 mb-1">Desde</label>
                              <select value={lapso.desde} onChange={e => actualizarLapsoEspecial(idx, 'desde', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs">
                                {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-zinc-600 mb-1">Hasta</label>
                              <select value={lapso.hasta} onChange={e => actualizarLapsoEspecial(idx, 'hasta', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs">
                                {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                            </div>
                          </div>
                          {lapsosEspeciales.length > 1 && (
                            <button type="button" onClick={() => quitarLapsoEspecial(idx)} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={agregarLapsoEspecial} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors w-fit">
                        <Plus size={13} /> Agregar lapso
                      </button>

                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-zinc-500">Duración de cada turno</p>
                        <div className="flex flex-wrap gap-1.5">
                          {INTERVALOS.map(op => (
                            <button key={op.value} type="button" onClick={() => setIntervaloEspecial(op.value)}
                              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${intervaloEspecial === op.value ? 'bg-white text-zinc-900 font-medium' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
                              {op.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-zinc-600">
                        Se van a habilitar <span className="text-zinc-300 font-medium">{previewEspecial.length} turnos</span>
                      </p>

                      {errorEspecial && (
                        <p className="text-xs text-red-400">{errorEspecial}</p>
                      )}

                      <div className="flex gap-2">
                        <button onClick={() => { setEditandoEspecial(false); setErrorEspecial(''); }} className="flex-1 py-2 rounded-lg text-sm border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors">
                          Cancelar
                        </button>
                        <button onClick={guardarEspeciales} disabled={loading || previewEspecial.length === 0} className="flex-1 py-2 rounded-lg text-sm bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors">
                          {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
