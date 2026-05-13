import type { Turno } from '@/lib/types';

interface Props {
  turno: Turno;
  onCancel?: (id: number) => void;
}

export default function TurnoCard({ turno, onCancel }: Props) {
  return (
    <div className={`rounded-lg border p-4 ${turno.disponible ? 'bg-white' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{turno.fecha} — {turno.hora}</p>
          {!turno.disponible && (
            <p className="text-sm text-gray-600">
              {turno.cliente_nombre} · {turno.cliente_telefono}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            turno.disponible
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {turno.disponible ? 'Disponible' : 'Reservado'}
          </span>
          {!turno.disponible && onCancel && (
            <button
              onClick={() => onCancel(turno.id)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
