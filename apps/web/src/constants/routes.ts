/**
 * FC211 F3 (D13) — rutas de entrada de Archon. Arcsial es el inicio de todos tras el acceso y al abrir
 * la raíz; el Centro de Comando sigue en el menú para quien opera la flota de su Universo.
 */

/** Inicio canónico de todo cosmonauta (Ω incluido). */
export const ARCSIAL_HOME_PATH = '/dashboard/social';

/** Centro de Comando: tablero operativo del Universo. */
export const COMMAND_CENTER_PATH = '/dashboard';

/** Permiso que abre el Centro de Comando. Ω lo cumple por su comodín `*`. */
export const COMMAND_CENTER_PERMISSION = 'fleet:unit:view:any';
