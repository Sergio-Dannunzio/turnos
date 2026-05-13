'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { ChevronLeft, ChevronRight, Check, Plus, X } from 'lucide-react';

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

  async function cargar(nId: number, f: string) {
    setLoading(true);
    const diaSemana = DIAS_ES[new Date(f + 'T12:00:00').getDay()];

    const [{ data: horarios }, { data: reservas }] = await Promise.all([
      supabase.from('horarios').select('hora').eq('negocio_id', nId).eq('dia_semana', diaSemana).eq('activo', true).order('hora'),
      supabase.from('reservas').select('id, hora, cliente_nombre, cliente_telefono, completado').eq('negocio_id', nId).eq('fecha', f),
    ]);

    const reservaMap = new Map(reservas?.map(r => [r.hora.slice(0, 5), r]) ?? []);

    const slotsList: Slot[] = (horarios ?? []).map(h => {
      const hora = h.hora.slice(0, 5);
      const reserva = reservaMap.get(hora);
      return { hora, reserva: reserva ? { id: reserva.id, cliente_nombre: reserva.cliente_nombre, cliente_telefono: reserva.cliente_telefono, completado: reserva.completado } : undefined };
    });

    setSlots(slotsList);
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Turnos</h1>
          <p className="text-sm text-zinc-500 capitalize">{formatFecha(fecha)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFecha(f => addDays(f, -1))} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setFecha(new Date().toISOString().split('T')[0])} className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
            Hoy
          </button>
          <button onClick={() => setFecha(f => addDays(f, 1))} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <ChevronRight size={18} />
          </button>
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

      {/* Slots */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-16 animate-pulse" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-12">No hay horarios configurados para este día.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {slots.map(slot => (
            <div key={slot.hora}>
              {/* Slot card */}
              <div className={`bg-zinc-900 border rounded-xl p-4 transition-colors ${
                slot.reserva?.completado
                  ? 'border-green-500/20'
                  : slot.reserva
                  ? 'border-zinc-700'
                  : 'border-zinc-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-zinc-300 w-12">{slot.hora}</span>
                    {slot.reserva ? (
                      <div>
                        <p className={`text-sm font-medium ${slot.reserva.completado ? 'text-zinc-500 line-through' : 'text-white'}`}>
                          {slot.reserva.cliente_nombre}
                        </p>
                        <p className="text-xs text-zinc-600">{slot.reserva.cliente_telefono}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-600">Disponible</span>
                    )}
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

              {/* Inline form */}
              {formSlot === slot.hora && (
                <div className="bg-zinc-900 border border-zinc-700 border-t-0 rounded-b-xl px-4 pb-4 pt-3 flex gap-2 items-end">
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
                  <button
                    onClick={() => registrarManual(slot.hora)}
                    disabled={saving}
                    className="bg-white text-zinc-900 rounded-lg px-4 py-1.5 text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                  >
                    {saving ? '...' : 'Guardar'}
                  </button>
                  <button onClick={() => setFormSlot(null)} className="p-1.5 text-zinc-600 hover:text-zinc-300">
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
