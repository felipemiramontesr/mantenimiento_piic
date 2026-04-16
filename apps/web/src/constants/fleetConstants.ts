// ⚡ ARCHON FLEET CONSTANTS (v.9.0.0)
// Centralized Asset Intelligence catalogs

export const MARCAS_VEHICULO: Record<string, string[]> = {
  Toyota: ['Hilux', 'Land Cruiser', 'Fortuner', 'RAV4', 'Hiace', 'Tacoma'],
  Nissan: ['Frontier', 'NP300', 'Urvan', 'March', 'Sentra', 'Versa'],
  Ford: ['Ranger', 'F-150', 'Transit', 'Super Duty', 'Explorer'],
  Chevrolet: ['S10', 'Colorado', 'Silverado', 'Aveo', 'Express'],
  Mitsubishi: ['L200', 'Montero Sport', 'Mirage G4'],
  Volkswagen: ['Amarok', 'Crafter', 'Transporter', 'Saveiro', 'Vento'],
  Hyundai: ['H1', 'Starex', 'L90', 'Creta'],
};

export const MARCAS_MAQUINARIA: Record<string, string[]> = {
  Caterpillar: [
    'Excavadora 320L',
    'Retroexcavadora 416F',
    'Compactador CP533',
    'Motoniveladora 12M',
  ],
  JohnDeere: ['Tractor 6150J', 'Retroexcavadora 310L', 'Excavadora 210G'],
  Komatsu: ['Excavadora PC200', 'Bulldozer D65', 'Camión 730E'],
  Bobcat: ['Minicargador S450', 'Miniexcavadora E35'],
  JLG: ['Elevador 450AJ', 'Plataforma Tijera 2632ES'],
  Genie: ['Manlift S-60', 'Plataforma GS-1930'],
};

export const MARCAS_HERRAMIENTA: Record<string, string[]> = {
  Hilti: ['Rotomartillo TE-70', 'Sierra Circular SCW-70', 'Nivel Láser PR-30'],
  Milwaukee: ['Taladro M18', 'Llave de Impacto M18 FUEL', 'Esmeril M18'],
  DeWalt: ['Demoledor D25', 'Sierra de Inglete DWS780'],
  Bosch: ['Martillo Perforador GBH', 'Medidor Láser GLM'],
  Stihl: ['Motosierra MS-261', 'Motobomba WP-300'],
};

export const MAINTENANCE_FREQUENCIES = [
  'Diaria',
  'Semanal',
  'Mensual',
  'Bimestral',
  'Semestral',
  'Anual',
] as const;

export const ASSET_TYPES = ['Vehiculo', 'Maquinaria', 'Herramienta'] as const;
export const FUEL_TYPES = ['Gasolina', 'Diesel', 'Eléctrico', 'Híbrido', 'N/A'] as const;
export const TRACCION_OPTIONS = ['4x2', '4x4', 'Doble Tracción', 'AWD', 'Oruga', 'N/A'] as const;
export const TRANSMISION_OPTIONS = [
  'Automática',
  'Estándar (Manual)',
  'CVT',
  'Hidrostática',
  'N/A',
] as const;
