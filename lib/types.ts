export interface Empleado {
  id: number;
  negocio_id: number;
  nombre: string;
  activo: boolean;
  creado_en: string;
}

export interface Horario {
  id: number;
  dia_semana: string;
  hora: string;
  activo: boolean;
  empleado_id: number | null;
}

export interface Reserva {
  id: number;
  fecha: string;
  hora: string;
  cliente_nombre: string;
  cliente_telefono: string;
  completado: boolean;
  origen: 'bot' | 'manual';
  empleado_id: number | null;
  creado_en: string;
}

export interface Bloqueo {
  id: number;
  fecha: string;
  hora: string | null;
  empleado_id: number | null;
}
