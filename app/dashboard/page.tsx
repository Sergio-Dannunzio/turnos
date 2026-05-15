'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const DIAS_ES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function formatFechaLarga(fecha: string) {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function diaCortoPorFecha(dateStr: string) {
  return DIAS_CORTO[new Date(dateStr + 'T12:00:00').getDay()];
}

function horaActual() {
  return new Date().toTimeString().slice(0, 5);
}

function StatCard({ valor, label, sub }: { valor: number; label: string; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
      <p className="text-3xl font-bold text-white">{valor}</p>
      <p className="text-sm text-zinc-500">{label}</p>
      {sub && <p className="text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

function SkeletonRect({ h = 'h-24', w = 'w-full' }: { h?: string; w?: string }) {
  return <div className={`${h} ${w} bg-zinc-800 rounded-xl animate-pulse`} />;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const completados = payload.find((p: any) => p.dataKey === 'completados')?.value ?? 0;
  const pendientes = payload.find((p: any) => p.dataKey === 'pendientes')?.value ?? 0;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-zinc-300 font-semibold mb-1">{label}</p>
      {completados > 0 && <p className="text-green-400">{completados} completado{completados !== 1 ? 's' : ''}</p>}
      {pendientes > 0 && <p className="text-zinc-300">{pendientes} pendiente{pendientes !== 1 ? 's' : ''}</p>}
      {completados + pendientes === 0 && <p className="text-zinc-600">Sin reservas</p>}
    </div>
  );
};

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
type Periodo = 'semana' | 'mes' | 'año';

function getChartConfig(reservas: any[], periodo: Periodo, today: string) {
  const year = today.slice(0, 4);
  const mesNum = new Date().getMonth();
  const daysInMonth = new Date(Number(year), mesNum + 1, 0).getDate();

  if (periodo === 'semana') {
    const data = Array.from({ length: 7 }, (_, i) => {
      const fecha = addDays(today, i);
      const del = reservas.filter(r => r.fecha === fecha);
      return { label: diaCortoPorFecha(fecha), completados: del.filter(r => r.completado).length, pendientes: del.filter(r => !r.completado).length };
    });
    const total = data.reduce((s, d) => s + d.completados + d.pendientes, 0);
    return { data, total, titulo: 'Esta semana', barSize: 28, xInterval: 0 };
  }

  if (periodo === 'mes') {
    const mesStr = today.slice(0, 7);
    const data = Array.from({ length: daysInMonth }, (_, i) => {
      const dia = String(i + 1).padStart(2, '0');
      const fecha = `${mesStr}-${dia}`;
      const del = reservas.filter(r => r.fecha === fecha);
      return { label: String(i + 1), completados: del.filter(r => r.completado).length, pendientes: del.filter(r => !r.completado).length };
    });
    const total = data.reduce((s, d) => s + d.completados + d.pendientes, 0);
    return { data, total, titulo: `${MESES_CORTO[mesNum]} ${year}`, barSize: 10, xInterval: 4 };
  }

  // año
  const data = Array.from({ length: 12 }, (_, i) => {
    const mesStr = String(i + 1).padStart(2, '0');
    const del = reservas.filter(r => r.fecha.startsWith(`${year}-${mesStr}`));
    return { label: MESES_CORTO[i], completados: del.filter(r => r.completado).length, pendientes: del.filter(r => !r.completado).length };
  });
  const total = data.reduce((s, d) => s + d.completados + d.pendientes, 0);
  return { data, total, titulo: year, barSize: 24, xInterval: 0 };
}

export default function AgendaPage() {
  const [negocioId, setNegocioId] = useState<number | null>(null);
  const [reservas, setReservas] = useState<any[]>([]);
  const [totalSlotsHoy, setTotalSlotsHoy] = useState(0);
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowser();

  const today = new Date().toISOString().split('T')[0];

  async function cargar(nId: number) {
    const startOfYear = `${today.slice(0, 4)}-01-01`;
    const endOfYear = `${today.slice(0, 4)}-12-31`;
    const diaSemana = DIAS_ES[new Date().getDay()];

    const [{ data: res }, { data: horarios }] = await Promise.all([
      supabase.from('reservas').select('*')
        .eq('negocio_id', nId)
        .gte('fecha', startOfYear)
        .lte('fecha', endOfYear)
        .order('fecha').order('hora'),
      supabase.from('horarios').select('hora')
        .eq('negocio_id', nId)
        .eq('dia_semana', diaSemana)
        .eq('activo', true),
    ]);

    setReservas(res ?? []);
    setTotalSlotsHoy(horarios?.length ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles').select('negocio_id').eq('id', user!.id).single();
      const nId = profile!.negocio_id;
      setNegocioId(nId);
      await cargar(nId);
    }
    init();
  }, []);

  useEffect(() => {
    if (!negocioId) return;
    const channel = supabase
      .channel('reservas-agenda')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas', filter: `negocio_id=eq.${negocioId}` }, () => {
        cargar(negocioId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [negocioId]);

  const reservasHoy = reservas.filter(r => r.fecha === today);
  const completadosHoy = reservasHoy.filter(r => r.completado).length;
  const pendientesHoy = reservasHoy.filter(r => !r.completado).length;
  const libresHoy = totalSlotsHoy - reservasHoy.length;

  const ahora = horaActual();
  const proximoTurno = reservasHoy
    .filter(r => !r.completado && r.hora.slice(0, 5) >= ahora)
    .sort((a, b) => a.hora.localeCompare(b.hora))[0] ?? null;

  const { data: chartData, total: chartTotal, titulo: chartTitulo, barSize, xInterval } =
    getChartConfig(reservas, periodo, today);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Agenda</h1>
        <p className="text-sm text-zinc-500 capitalize">{formatFechaLarga(today)}</p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <SkeletonRect key={i} h="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard valor={reservasHoy.length} label="Turnos hoy" />
          <StatCard valor={completadosHoy} label="Completados" />
          <StatCard valor={pendientesHoy} label="Pendientes" />
          <StatCard valor={libresHoy >= 0 ? libresHoy : 0} label="Libres" />
        </div>
      )}

      {/* Próximo turno */}
      {!loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 font-medium mb-3">Próximo turno</p>
          {proximoTurno ? (
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-white tabular-nums">
                {proximoTurno.hora.slice(0, 5)}
              </span>
              <div>
                <p className="text-white font-medium">{proximoTurno.cliente_nombre}</p>
                <p className="text-sm text-zinc-500">{proximoTurno.cliente_telefono}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-600">
              {reservasHoy.length > 0 ? 'Todos los turnos de hoy están completados.' : 'Sin turnos pendientes para hoy.'}
            </p>
          )}
        </div>
      )}

      {/* Gráfico */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-medium text-zinc-300">{chartTitulo}</p>
            {!loading && (
              <p className="text-xs text-zinc-600 mt-0.5">
                {chartTotal} reserva{chartTotal !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
            {(['semana', 'mes', 'año'] as Periodo[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                  periodo === p ? 'bg-zinc-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <SkeletonRect h="h-48" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={barSize} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={xInterval}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={20}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a' }} />
              <Bar dataKey="completados" stackId="a" fill="#22c55e" name="Completados" radius={[0, 0, 0, 0]} />
              <Bar dataKey="pendientes" stackId="a" fill="#e4e4e7" name="Pendientes" radius={[4, 4, 0, 0]} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span style={{ color: '#71717a', fontSize: 12 }}>{value}</span>}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Turnos de hoy */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-zinc-400">Turnos de hoy</p>
          {!loading && reservasHoy.length > 0 && (
            <button
              onClick={() => setMostrarTodos(v => !v)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                mostrarTodos
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {mostrarTodos ? 'Solo próximos' : 'Mostrar todos'}
            </button>
          )}
        </div>
        {loading ? (
          <div className="flex flex-col gap-2">{[1,2,3].map(i => <SkeletonRect key={i} h="h-14" />)}</div>
        ) : reservasHoy.length === 0 ? (
          <p className="text-sm text-zinc-600">Sin reservas para hoy.</p>
        ) : (() => {
          const visibles = mostrarTodos
            ? reservasHoy
            : reservasHoy.filter(r => r.hora.slice(0, 5) >= ahora);
          return visibles.length === 0 ? (
            <p className="text-sm text-zinc-600">No quedan turnos para el resto del día.</p>
          ) : (
          <div className="flex flex-col gap-2">
            {visibles.map(r => (
              <div
                key={r.id}
                className={`bg-zinc-900 border rounded-xl px-4 py-3 flex items-center gap-4 ${
                  r.completado ? 'border-zinc-800 opacity-50' : 'border-zinc-800'
                }`}
              >
                <span className="text-sm font-semibold text-zinc-400 tabular-nums w-12">
                  {r.hora.slice(0, 5)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${r.completado ? 'line-through text-zinc-500' : 'text-white'}`}>
                    {r.cliente_nombre}
                  </p>
                  <p className="text-xs text-zinc-600 truncate">{r.cliente_telefono}</p>
                </div>
                {r.completado && (
                  <span className="text-xs text-green-500 shrink-0">Completado</span>
                )}
              </div>
            ))}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
