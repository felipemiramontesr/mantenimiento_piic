export interface FleetUnit {
  id: string; // FLXXX format
  uuid: string;
  tag: string;
  unit_name: string;
  year: number;
  fuel_type: 'Gasolina' | 'Diesel';
  tire_spec: string | null;
  tire_brand: string | null;
  unit_type: string;
  unit_usage: string;
  status: 'Disponible' | 'En Ruta' | 'En Mantenimiento' | 'Descontinuada';
  odometer: number;
  assigned_operator_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFleetUnit {
  tag: string;
  unit_name: string;
  year: number;
  fuel_type: 'Gasolina' | 'Diesel';
  tire_spec?: string;
  tire_brand?: string;
  unit_type: string;
  unit_usage: string;
  status?: 'Disponible' | 'En Ruta' | 'En Mantenimiento' | 'Descontinuada';
  odometer?: number;
}
