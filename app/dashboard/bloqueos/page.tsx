'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Bloqueo } from '@/lib/types';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_ES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function BloqueosPage() {
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [negocioId, setNegocioId] = useState<number | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [horariosDelDia, setHorariosDelDia] = useState<string[]>([]);
  const [selectedHoras, setSelectedHoras] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('negocio_id').eq('id', user!.id).single();
      setNegocioId(profile!.negocio_id);
      await cargar(profile!.negocio_id);
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
      .from('horarios')
      .select('hora')
      .eq('negocio_id', nId)
      .eq('dia_semana', diaSemana)
      .eq('activo', true)
      .order('hora');
    setHorariosDelDia(data?.map(h => h.hora.slice(0, 5)) ?? []);
  }

  async function handleSelectDate(dateStr: string) {
    if (selectedDate === dateStr) {
      setSelectedDate(null);
      setHorariosDelDia([]);
      setSelectedHoras([]);
      return;
    }
    setSelectedDate(dateStr);
    setSelectedHoras([]);
    if (negocioId) await cargarHorarios(dateStr, negocioId);
  }

  function toggleHora(hora: string) {
    setSelectedHoras(prev =>
      prev.includes(hora) ? prev.filter(h => h !== hora) : [...prev, hora]
    );
  }

  async function guardar() {
    if (!negocioId || !selectedDate) return;
    setLoading(true);

    const rows = selectedHoras.map(hora => ({ negocio_id: negocioId, fecha: selectedDate, hora }));

    for (const row of rows) {
      await supabase.from('bloqueos').insert(row);
    }

    setSelectedHoras([]);
    setDiaEntero(false);
    await cargar();
    setLoading(false);
  }

  async function eliminar(id: number) {
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
  const horasBloqueadas = bloqueosDelDia.filter(b => b.hora).map(b => b.hora!.slice(0, 5));
  const tieneBloqueoTotal = bloqueosDelDia.some(b => !b.hora);

  const canSave = selectedHoras.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Bloqueos</h1>
        <p className="text-sm text-zinc-500">Seleccioná un día para bloquearlo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

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

              return (
                <button
                  key={day}
                  onClick={() => handleSelectDate(dateStr)}
                  className={`
                    relative aspect-square flex items-center justify-center rounded-lg text-sm transition-all
                    ${isSelected ? 'bg-white text-zinc-900 font-bold'
                      : fullyBlocked ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : partialBlocked ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                      : 'text-zinc-300 hover:bg-zinc-800'}
                  `}
                >
                  {day}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-5 mt-5 pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-500"><div className="w-3 h-3 rounded bg-red-500/20" /> Día completo</div>
            <div className="flex items-center gap-2 text-xs text-zinc-500"><div className="w-3 h-3 rounded bg-yellow-500/10" /> Parcial</div>
            <div className="flex items-center gap-2 text-xs text-zinc-500"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 mx-0.5" /> Hoy</div>
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
                <p className="text-xs text-zinc-500">Seleccioná qué bloquear</p>
              </div>

              {/* Bloqueos activos */}
              {bloqueosDelDia.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-zinc-500 font-medium">Bloqueado</p>
                  {bloqueosDelDia.map(b => (
                    <div key={b.id} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-1.5">
                      <span className="text-sm text-zinc-300">{b.hora ? b.hora.slice(0, 5) + ' hs' : 'Día completo'}</span>
                      <button onClick={() => eliminar(b.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Selector */}
              {!tieneBloqueoTotal && (
                <div className="flex flex-col gap-3 border-t border-zinc-800 pt-4">
                  {/* Día entero */}
                  <button
                    onClick={async () => {
                      if (!negocioId || !selectedDate) return;
                      setLoading(true);
                      await supabase.from('bloqueos').insert({ negocio_id: negocioId, fecha: selectedDate, hora: null });
                      setSelectedHoras([]);
                      await cargar();
                      setLoading(false);
                    }}
                    disabled={loading}
                    className="w-full py-2 rounded-lg text-sm font-medium border border-zinc-700 text-zinc-400 hover:border-red-500/40 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50 transition-colors"
                  >
                    Bloquear día completo
                  </button>

                  {/* Horarios del día */}
                  {horariosDelDia.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-zinc-500">O elegí horarios específicos</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {horariosDelDia.map(hora => {
                          const yaBloquead = horasBloqueadas.includes(hora);
                          const seleccionada = selectedHoras.includes(hora);
                          return (
                            <button
                              key={hora}
                              disabled={yaBloquead}
                              onClick={() => toggleHora(hora)}
                              className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                yaBloquead
                                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                  : seleccionada
                                  ? 'bg-white text-zinc-900'
                                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                              }`}
                            >
                              {hora}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {canSave && (
                    <button
                      onClick={guardar}
                      disabled={loading}
                      className="w-full bg-white text-zinc-900 rounded-lg py-2 text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                    >
                      {loading ? 'Guardando...' : `Bloquear ${selectedHoras.length} turno${selectedHoras.length > 1 ? 's' : ''}`}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
