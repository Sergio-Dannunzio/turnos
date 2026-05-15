export interface Horario {
  id: number;
  dia_semana: string;
  hora: string;
  activo: boolean;
}

export interface Reserva {
  id: number;
  fecha: string;
  hora: string;
  cliente_nombre: string;
  cliente_telefono: string;
  completado: boolean;
  origen: 'bot' | 'manual';
  creado_en: string;
}

export interface Bloqueo {
  id: number;
  fecha: string;
  hora: string | null;
}
