export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrengthResult {
  readonly level: PasswordStrengthLevel;
  readonly label: string;
  readonly suggestion: string;
}

const LABELS: readonly string[] = ['Muy débil', 'Débil', 'Media', 'Fuerte', 'Muy fuerte'];
const SUGGESTIONS: readonly string[] = [
  'Usa al menos 8 caracteres, mezclando mayúsculas, minúsculas y números.',
  'Agrega símbolos y evita palabras comunes o secuencias obvias.',
  'Aumenta la longitud a 12+ caracteres para mayor seguridad.',
  'Muy buena — considera 14+ caracteres para el nivel máximo.',
  'Excelente — esta contraseña es de alta entropía.',
];

/** FC184 F3 (Cond.R-184 R3) — detecta el patrón obvio más común (un solo carácter repetido) y una
 *  lista corta de secuencias/contraseñas triviales conocidas; no pretende ser un diccionario
 *  exhaustivo, solo evitar que algo como "aaaaaaaa" o "password123" pase por "fuerte" solo por
 *  cumplir longitud+diversidad de clases. */
const OBVIOUS_PATTERNS = [/^(.)\1+$/, /12345678|123456789|87654321|qwerty|password|letmein|admin/i];

function countCharacterClasses(password: string): number {
  return [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length;
}

function hasObviousPattern(password: string): boolean {
  return OBVIOUS_PATTERNS.some((re) => re.test(password));
}

function levelFromLengthAndClasses(password: string, classes: number): PasswordStrengthLevel {
  if (password.length < 8) return 0;
  if (password.length >= 14 && classes >= 4) return 4;
  if (password.length >= 12 && classes >= 3) return 3;
  if (password.length >= 10 && classes >= 2) return 2;
  return 1;
}

/** Medidor de fuerza 100% nativo (Cond.R-184 R3, cero dependencias npm): longitud + diversidad de
 *  clases de carácter, con techo de nivel 1 si detecta un patrón obvio — evita que la longitud por
 *  sí sola maquille una contraseña trivial. */
export function computePasswordStrength(password: string): PasswordStrengthResult {
  const classes = countCharacterClasses(password);
  let level = levelFromLengthAndClasses(password, classes);
  if (hasObviousPattern(password) && level > 1) level = 1;

  return { level, label: LABELS[level], suggestion: SUGGESTIONS[level] };
}
