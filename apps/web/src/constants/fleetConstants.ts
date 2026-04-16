// ⚡ ARCHON FLEET CONSTANTS (v.16.3.0)
// Centralized Asset Intelligence catalogs

export const MARCAS_VEHICULO: Record<string, string[]> = {
  Toyota: ['Hilux', 'Tacoma', 'Tundra', 'Hiace', 'Land Cruiser', 'RAV4'],
  Nissan: ['NP300', 'Frontier', 'Urvan', 'Sentra', 'March', 'Kicks'],
  Ford: ['F-150', 'Ranger', 'Transit', 'F-250', 'F-350', 'F-450', 'F-550 (Super Duty)', 'Explorer'],
  Chevrolet: ['Silverado', 'Cheyenne', 'S10', 'Colorado', 'Express', 'Tornado', 'Aveo'],
  RAM: ['700', '1500', '2500', '4000', 'Promaster'],
  Dodge: ['Attitude', 'Journey'],
  Mitsubishi: ['L200', 'Montero Sport', 'Mirage G4'],
  Volkswagen: ['Amarok', 'Crafter', 'Transporter', 'Saveiro', 'Vento'],
  Hyundai: ['H1', 'Starex', 'L90', 'Creta'],
  Kenworth: ['T680', 'T880', 'T800', 'W900', 'KW55', 'T370'],
  Freightliner: ['Cascadia', 'M2 106', 'M2 112', 'FL 360 (715, 917, 1217)'],
  International: ['LoneStar', 'LT Series', 'MV Series', 'HV Series', 'HX Series'],
  Isuzu: ['ELF 200', 'ELF 300', 'ELF 400', 'ELF 500', 'ELF 600', 'Forward 800', 'Forward 1100'],
  Hino: ['Serie 300 (514, 616, 716, 816)', 'Serie 500 (1018, 1724, 1727, 2628)'],
  MercedesBenz: ['Actros', 'Arocs', 'Atego', 'Accelo'],
  VolvoTrucks: ['FH', 'FM', 'FMX', 'VNL', 'VNR'],
};

export const MARCAS_MAQUINARIA: Record<string, string[]> = {
  Caterpillar: [
    'Excavadora 320L',
    'Excavadora 336D',
    'Retroexcavadora 416F',
    'Cargador 950H',
    'Cargador 980K',
    'Motoniveladora 12M',
    'Tractor D6T',
    'Tractor D8T',
    'Camión Fuera de Carretera 777G',
  ],
  Komatsu: [
    'Excavadora PC200',
    'Excavadora PC350',
    'Bulldozer D65',
    'Motoniveladora GD555',
    'Camión 730E',
    'Camión 830E',
    'Camión Fuera de Carretera HD785',
  ],
  Epiroc: [
    'SmartROC D65',
    'Simba S7',
    'Boomer S2',
    'Minetruck MT2010',
    'Scooptram ST14',
    'Scooptram ST18',
  ],
  Sandvik: ['Leopard DI650i', 'Jumbo DD421', 'Dumper TH545i', 'Scoop LH517i'],
  Normet: ['Spraymec 8100', 'Utimec LF 600', 'Charmec 1610'],
  JohnDeere: ['Tractor 6150J', 'Retroexcavadora 310L', 'Excavadora 210G', 'Tractor 850L'],
  Bobcat: ['Minicargador S450', 'Miniexcavadora E35'],
  JLG: ['Elevador 450AJ', 'Plataforma Tijera 2632ES', 'Brazo S600'],
  Genie: ['Manlift S-60', 'Plataforma GS-1930', 'Brazo Z-45'],
  Sany: ['Excavadora SY215', 'Motoniveladora SAG200'],
  XCMG: ['Grúa QY50', 'Cargador LW500'],
};

export const MARCAS_HERRAMIENTA: Record<string, string[]> = {
  Hilti: ['Rotomartillo TE-70', 'Sierra Circular SCW-70', 'Nivel Láser PR-30'],
  Milwaukee: ['Taladro M18', 'Llave de Impacto M18 FUEL', 'Esmeril M18'],
  DeWalt: ['Demoledor D25', 'Sierra de Inglete DWS780'],
  Bosch: ['Martillo Perforador GBH', 'Medidor Láser GLM'],
  Stihl: ['Motosierra MS-261', 'Motobomba WP-300'],
  Miller: ['Soldadora Big Blue 500', 'Soldadora Trailblazer 325'],
  LincolnElectric: ['Soldadora Vantage 400', 'Soldadora Ranger 250'],
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
export const FUEL_TYPES = ['Gasolina', 'Diesel', 'Eléctrico', 'Híbrido', 'No Aplica'] as const;
export const TRACCION_OPTIONS = [
  '4x2',
  '4x4',
  'Doble Tracción',
  'AWD',
  'Oruga',
  'No Aplica',
] as const;
export const TRANSMISION_OPTIONS = [
  'Automática',
  'Estándar (Manual)',
  'Transmisión Continuamente Variable (CVT)',
  'Hidrostática',
  'No Aplica',
] as const;

export const DEPARTAMENTOS = [
  'Administración',
  'Exploración',
  'Geología',
  'Laboratorio',
  'Mantenimiento Eléctrico',
  'Mantenimiento Planta',
  'Medio Ambiente',
  'Operación Mina',
  'Operación Planta',
  'Planeación',
  'Relaciones Comunitarias',
  'Seguridad Patrimonial',
  'Seguridad Industrial',
] as const;

export const USO_OPTIONS = [
  'Campo',
  'Carretera',
  'Ciudad',
  'Extremo',
  'Mina',
  'Pesado',
  'Planta',
  'Relaciones Comunitarias',
  'Reparto',
  'Terracería',
] as const;

export const TIPO_TERRENO_OPTIONS = [
  'All-Terrain',
  'Carga Ligera',
  'Carga Pesada (Rango E)',
  'Carga Especializada (Tipo C)',
  'Carga Ligera',
  'High Terrain',
  'Mixta / High Terrain',
  'Mud-Terrain',
  'Passenger',
  'SUV/Carretera',
] as const;

export const SEDES = ['Arian Silver Zacatecas'] as const;

export const MARCAS_NEUMATICOS = [
  'Michelin',
  'Bridgestone',
  'Continental',
  'Goodyear',
  'Pirelli',
  'BFGoodrich',
  'Firestone',
  'JK Tyre',
  'Tornel',
  'Nexen',
  'Kumho',
  'General Tire',
  'Cooper Tires',
  'Yokohama',
  'N/A',
] as const;
