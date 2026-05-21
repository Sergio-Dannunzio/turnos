import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-server';

const PRECIO_INPUT  = 0.0000008;  // $0.80 por millón
const PRECIO_OUTPUT = 0.000004;   // $4.00 por millón

export async function GET(req: NextRequest) {
  const admin = createSupabaseAdmin();

  // Mes consultado (default: mes actual)
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes'); // formato: "2026-05"

  const desde = mes
    ? new Date(`${mes}-01T00:00:00Z`)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const hasta = new Date(desde);
  hasta.setMonth(hasta.getMonth() + 1);

  // Tokens agrupados por negocio y canal
  const { data: tokens, error } = await admin
    .from('uso_tokens')
    .select('negocio_id, canal, input_tokens, output_tokens')
    .gte('creado_at', desde.toISOString())
    .lt('creado_at', hasta.toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Negocios para obtener nombres
  const { data: negocios } = await admin
    .from('negocios')
    .select('id, nombre, plan');

  const negocioMap = new Map((negocios ?? []).map(n => [n.id, n]));

  // Agregar por negocio
  const porNegocio = new Map<number, {
    nombre: string; plan: string;
    inputTokens: number; outputTokens: number;
    inputVoz: number; outputVoz: number;
  }>();

  for (const row of tokens ?? []) {
    if (!porNegocio.has(row.negocio_id)) {
      const neg = negocioMap.get(row.negocio_id);
      porNegocio.set(row.negocio_id, {
        nombre: neg?.nombre ?? `Negocio ${row.negocio_id}`,
        plan: neg?.plan ?? 'trial',
        inputTokens: 0, outputTokens: 0,
        inputVoz: 0, outputVoz: 0,
      });
    }
    const entry = porNegocio.get(row.negocio_id)!;
    if (row.canal === 'voice') {
      entry.inputVoz  += row.input_tokens;
      entry.outputVoz += row.output_tokens;
    } else {
      entry.inputTokens  += row.input_tokens;
      entry.outputTokens += row.output_tokens;
    }
  }

  const resultado = [...porNegocio.entries()].map(([id, d]) => {
    const totalInput  = d.inputTokens + d.inputVoz;
    const totalOutput = d.outputTokens + d.outputVoz;
    const costoUsd = totalInput * PRECIO_INPUT + totalOutput * PRECIO_OUTPUT;
    return {
      id,
      nombre: d.nombre,
      plan: d.plan,
      inputTokens: totalInput,
      outputTokens: totalOutput,
      inputWsp: d.inputTokens,
      outputWsp: d.outputTokens,
      inputVoz: d.inputVoz,
      outputVoz: d.outputVoz,
      costoUsd: Math.round(costoUsd * 10000) / 10000,
    };
  }).sort((a, b) => b.costoUsd - a.costoUsd);

  return NextResponse.json({ mes: desde.toISOString().slice(0, 7), data: resultado });
}
