export const FIELD_LABEL_CLASS =
  'font-sans text-archon-base font-black text-pinnacle-navy uppercase tracking-[0.18em] opacity-70';

/** FC184 F2 — el color de borde es un parámetro (no un `className` concatenado aparte) para que
 *  nunca haya dos utilidades `border-b-*` compitiendo por especificidad en el mismo elemento. */
export function fieldInputClass(borderColorClass: string): string {
  return `w-full h-12 bg-pinnacle-navy/[0.03] border-none border-b-2 ${borderColorClass} px-5 text-[15px] font-bold text-pinnacle-navy outline-none transition-all focus:bg-transparent focus:border-pinnacle-yellow focus:pl-3 rounded-[4px] placeholder:text-pinnacle-navy/20`;
}

export const FIELD_INPUT_CLASS = fieldInputClass('border-pinnacle-navy/10');

/** Clase del input reactivo a validez: sin tocar (`touched=false`) usa el borde neutro de
 *  siempre; tras la primera interacción, rojo si inválido, verde si válido. */
export function validatedFieldClass(touched: boolean, valid: boolean): string {
  if (!touched) return FIELD_INPUT_CLASS;
  return fieldInputClass(valid ? 'border-green-500/60' : 'border-red-500');
}
