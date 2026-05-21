'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';

const PRECIO_INPUT  = 0.0000008;
const PRECIO_OUTPUT = 0.000004;

type FilaNegocio = {
  id: number;
  nombre: string;
  plan: string;
  inputTokens: number;
  outputTokens: number;
  inputWsp: number; outputWsp: number;
  inputVoz: number; outputVoz: number;
  costoUsd: number;
};

const PLAN_COLORS: Record<string, string> = {
  trial:  '#a1a1aa',
  basico: '#3b82f6',
  pro:    '#8b5cf6',
};

function fmt(n: number) {
  return n.toLocaleString('es-AR');
}

function fmtUsd(n: number) {
  return `$${n.toFixed(4)}`;
}

export default function TokensPage() {
  const [data, setData] = useState<FilaNegocio[]>([]);
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/tokens?mes=${mes}`)
      .then(r => r.json())
      .then(res => { setData(res.data ?? []); setLoading(false); });
  }, [mes]);

  const totalCosto = data.reduce((s, d) => s + d.costoUsd, 0);
  const totalTokens = data.reduce((s, d) => s + d.inputTokens + d.outputTokens, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Uso de tokens</h1>
          <p className="text-sm text-zinc-500">Costo estimado de Claude por negocio</p>
        </div>
        <input
          type="month"
          value={mes}
          onChange={e => setMes(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 mb-1">Costo total del mes</p>
          <p className="text-2xl font-bold text-white">{fmtUsd(totalCosto)}</p>
          <p className="text-xs text-zinc-600 mt-1">USD estimado (Haiku 4.5)</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 mb-1">Tokens totales</p>
          <p className="text-2xl font-bold text-white">{fmt(totalTokens)}</p>
          <p className="text-xs text-zinc-600 mt-1">{data.length} negocio{data.length !== 1 ? 's' : ''} activos</p>
        </div>
      </div>

      {/* Gráfico */}
      {loading ? (
        <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center">
          <p className="text-zinc-600 text-sm">Sin datos para este mes</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
            <TrendingUp size={14} />
            Costo estimado por negocio (USD)
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="nombre"
                tick={{ fill: '#71717a', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${v.toFixed(2)}`}
                width={52}
              />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
                labelStyle={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}
                formatter={(value: number, name: string) => [
                  `$${value.toFixed(4)} USD`,
                  name === 'costoUsd' ? 'Costo' : name,
                ]}
              />
              <Bar dataKey="costoUsd" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {data.map(entry => (
                  <Cell key={entry.id} fill={PLAN_COLORS[entry.plan] ?? '#52525b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {Object.entries(PLAN_COLORS).map(([plan, color]) => (
              <span key={plan} className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabla detalle */}
      {!loading && data.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Negocio</th>
                <th className="text-right px-4 py-3 text-zinc-500 font-medium">Plan</th>
                <th className="text-right px-4 py-3 text-zinc-500 font-medium">Input</th>
                <th className="text-right px-4 py-3 text-zinc-500 font-medium">Output</th>
                <th className="text-right px-4 py-3 text-zinc-500 font-medium">Costo USD</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{row.nombre}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: `${PLAN_COLORS[row.plan]}20`, color: PLAN_COLORS[row.plan] }}
                    >
                      {row.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400">{fmt(row.inputTokens)}</td>
                  <td className="px-4 py-3 text-right text-zinc-400">{fmt(row.outputTokens)}</td>
                  <td className="px-4 py-3 text-right font-medium text-white">{fmtUsd(row.costoUsd)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-700">
                <td className="px-4 py-3 text-zinc-400 font-medium" colSpan={4}>Total</td>
                <td className="px-4 py-3 text-right font-bold text-white">{fmtUsd(totalCosto)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
