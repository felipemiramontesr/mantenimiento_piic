/** Redondea a 2 decimales, tolerando entradas vacías/no-numéricas (siempre
 * `0` en ese caso) — extraído de `useRouteAssignmentControl.ts` para que
 * `routeAssignmentActions.ts` pueda importarlo sin crear un ciclo (FC165 F3
 * Slice3.2 Batch1, Dual-Gate Isolation). */
const roundToTwo = (val: number | string | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  const num = Number(val);
  return Number.isNaN(num) ? 0 : Math.round(num * 100) / 100;
};

export default roundToTwo;
