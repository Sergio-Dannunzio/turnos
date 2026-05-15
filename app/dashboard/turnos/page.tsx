'use client';

import { useEffect, useRef, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { ChevronLeft, ChevronRight, Check, Plus, X, CalendarDays, Ban } from 'lucide-react';

const DIAS_ES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function formatFecha(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

type Slot = {
  hora: string;
  reserva?: {
    id: number;
    cliente_nombre: string;
    cliente_telefono: string;
    completado: boolean;
    origen: 'bot' | 'manual';
  };
};

type FormState = { nombre: string; telefono: string };

export default function TurnosPage() {
  const [negocioId, setNegocioId] = useState<number | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [formSlot, setFormSlot] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ nombre: '', telefono: '' });
  const [saving, setSaving] = useState(false);
  const [soloDisponibles, setSoloDisponibles] = useState(true);
  const [bloqueoTotal, setBloqueoTotal] = useState(false);
  const [horasBloqueadas, setHorasBloqueadas] = useState<string[]>([]);
  const [esDiaEspecial, setEsDiaEspecial] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('negocio_id').eq('id', user!.id).single();
      setNegocioId(profile!.negocio_id);
      await cargar(profile!.negocio_id, fecha);
    }
    init();
  }, []);

  useEffect(() => {
    if (negocioId) cargar(negocioId, fecha);
  }, [fecha]);

  useEffect(() => {
    if (!negocioId) return;
    const channel = supabase
      .channel('reservas-turnos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas', filter: `negocio_id=eq.${negocioId}` }, () => {
        cargar(negocioId, fecha);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [negocioId, fecha]);

  async function cargar(nId: number, f: string) {
    setLoading(true);
    const diaSemana = DIAS_ES[new Date(f + 'T12:00:00').getDay()];

    const [{ data: horarios }, { data: reservas }, { data: bloqueos }] = await Promise.all([
      supabase.from('horarios').select('hora').eq('negocio_id', nId).eq('dia_semana', diaSemana).eq('activo', true).order('hora'),
      supabase.from('reservas').select('id, hora, cliente_nombre, cliente_telefono, completado, origen').eq('negocio_id', nId).eq('fecha', f),
      supabase.from('bloqueos').select('hora').eq('negocio_id', nId).eq('fecha', f),
    ]);

    setBloqueoTotal(bloqueos?.some(b => b.hora === null) ?? false);
    setHorasBloqueadas(bloqueos?.filter(b => b.hora).map(b => b.hora!.slice(0, 5)) ?? []);

    const reservaMap = new Map(reservas?.map(r => [r.hora.slice(0, 5), r]) ?? []);

    let horasBase = horarios?.map(h => h.hora.slice(0, 5)) ?? [];
    let especial = false;

    if (horasBase.length === 0) {
      const { data: especiales } = await supabase
        .from('dias_especiales').select('hora')
        .eq('negocio_id', nId).eq('fecha', f).order('hora');
      if (especiales && especiales.length > 0) {
        horasBase = especiales.map(e => e.hora.slice(0, 5));
        especial = true;
      }
    }

    const slotsList: Slot[] = horasBase.map(hora => {
      const reserva = reservaMap.get(hora);
      return { hora, reserva: reserva ? { id: reserva.id, cliente_nombre: reserva.cliente_nombre, cliente_telefono: reserva.cliente_telefono, completado: reserva.completado } : undefined };
    });

    setSlots(slotsList);
    setEsDiaEspecial(especial);
    setLoading(false);
  }

  async function toggleCompletado(reservaId: number, actual: boolean) {
    await supabase.from('reservas').update({ completado: !actual }).eq('id', reservaId);
    if (negocioId) cargar(negocioId, fecha);
  }

  async function registrarManual(hora: string) {
    if (!negocioId) return;
    setSaving(true);
    await supabase.from('reservas').insert({
      negocio_id: negocioId,
      fecha,
      hora,
      cliente_nombre: form.nombre || 'Sin nombre',
      cliente_telefono: form.telefono || '-',
      origen: 'manual',
    });
    setFormSlot(null);
    setForm({ nombre: '', telefono: '' });
    setSaving(false);
    cargar(negocioId, fecha);
  }

  async function cancelarReserva(reservaId: number) {
    await supabase.from('reservas').delete().eq('id', reservaId);
    if (negocioId) cargar(negocioId, fecha);
  }

  const total = slots.length;
  const ocupados = slots.filter(s => s.reserva).length;
  const completados = slots.filter(s => s.reserva?.completado).length;

  const ahora = new Date().toTimeString().slice(0, 5);
  const esHoy = fecha === new Date().toISOString().split('T')[0];

  // Slot actual: el último que ya arrancó (para incluirlo aunque hayan pasado unos minutos)
  const slotActual = slots.map(s => s.hora).filter(h => h <= ahora).at(-1);

  const slotsFiltrados = soloDisponibles
    ? slots.filter(s => {
        if (s.reserva) return false;
        if (!esHoy) return true;
        return slotActual ? s.hora >= slotActual : s.hora >= ahora;
      })
    : slots;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Turnos</h1>
            {esDiaEspecial && !loading && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Día especial
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500 capitalize">{formatFecha(fecha)}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle disponibles/todos */}
          {!loading && slots.length > 0 && (
            <button
              onClick={() => setSoloDisponibles(v => !v)}
              className={`text-xs px-2.5 py-2 rounded-lg transition-colors ${
                soloDisponibles
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {soloDisponibles ? 'Disponibles' : 'Todos'}
            </button>
          )}

          {/* Navegación de fecha */}
          <div className="flex items-center gap-1">
            <button onClick={() => setFecha(f => addDays(f, -1))} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => dateInputRef.current?.showPicker()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-medium transition-colors capitalize whitespace-nowrap"
              >
                <CalendarDays size={13} className="text-zinc-500" />
                {new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </button>
              <input
                ref={dateInputRef}
                type="date"
                value={fecha}
                onChange={e => e.target.value && setFecha(e.target.value)}
                style={{ position: 'absolute', top: '100%', left: 0, width: 1, height: 1, opacity: 0.01 }}
              />
            </div>
            <button onClick={() => setFecha(f => addDays(f, 1))} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: total },
          { label: 'Reservados', value: ocupados },
          { label: 'Completados', value: completados },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Banner día bloqueado */}
      {!loading && bloqueoTotal && (
        <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
          <Ban size={15} className="text-orange-400 shrink-0" />
          <p className="text-sm text-orange-400">Este día está marcado como bloqueado.</p>
        </div>
      )}

      {/* Slots */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-16 animate-pulse" />
          ))}
        </div>
      ) : slotsFiltrados.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-12">
          {slots.length === 0
            ? 'No hay horarios configurados para este día.'
            : 'No hay turnos disponibles para este día.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {slotsFiltrados.map(slot => (
            <div key={slot.hora}>
              {/* Slot card */}
              {(() => {
                const bloqueado = horasBloqueadas.includes(slot.hora);
                return (
              <div className={`bg-zinc-900 border rounded-xl p-4 transition-colors ${
                bloqueado
                  ? 'border-orange-500/20'
                  : slot.reserva?.completado
                  ? 'border-green-500/20'
                  : slot.reserva
                  ? 'border-zinc-700'
                  : 'border-zinc-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-zinc-300 w-12">{slot.hora}</span>
                    {bloqueado && (
                      <span className="flex items-center gap-1 text-xs text-orange-400">
                        <Ban size={11} /> Bloqueado
                      </span>
                    )}
                    {!bloqueado && slot.reserva ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${slot.reserva.completado ? 'text-zinc-500 line-through' : 'text-white'}`}>
                            {slot.reserva.cliente_nombre}
                          </p>
                          {slot.reserva.origen === 'bot' ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Bot</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Manual</span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600">{slot.reserva.cliente_telefono}</p>
                      </div>
                    ) : !bloqueado ? (
                      <span className="text-sm text-zinc-600">Disponible</span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    {slot.reserva ? (
                      <>
                        <button
                          onClick={() => toggleCompletado(slot.reserva!.id, slot.reserva!.completado)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            slot.reserva.completado
                              ? 'bg-green-500/20 text-green-400 hover:bg-zinc-800 hover:text-zinc-400'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-green-500/20 hover:text-green-400'
                          }`}
                        >
                          <Check size={12} />
                          {slot.reserva.completado ? 'Completado' : 'Marcar'}
                        </button>
                        <button
                          onClick={() => cancelarReserva(slot.reserva!.id)}
                          className="p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setFormSlot(formSlot === slot.hora ? null : slot.hora)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                      >
                        <Plus size={12} />
                        Registrar
                      </button>
                    )}
                  </div>
                </div>
              </div>
                );
              })()}

              {/* Inline form */}
              {formSlot === slot.hora && (
                <div className="bg-zinc-900 border border-zinc-700 border-t-0 rounded-b-xl px-4 pb-4 pt-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-zinc-500 mb-1">Nombre <span className="text-zinc-700">(opcional)</span></label>
                      <input
                        autoFocus
                        value={form.nombre}
                        onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                        placeholder="Sin nombre"
                        className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 placeholder-zinc-600"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-zinc-500 mb-1">Teléfono <span className="text-zinc-700">(opcional)</span></label>
                      <input
                        value={form.telefono}
                        onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => registrarManual(slot.hora)}
                      disabled={saving}
                      className="flex-1 bg-white text-zinc-900 rounded-lg px-4 py-1.5 text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                    >
                      {saving ? '...' : 'Guardar'}
                    </button>
                    <button onClick={() => setFormSlot(null)} className="p-1.5 text-zinc-600 hover:text-zinc-300">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
