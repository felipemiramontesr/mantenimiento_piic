/** Parsea un datetime ISO o "YYYY-MM-DD HH:MM:SS" en fecha dd/mm/aaaa + hora HH:MM. */
export const fmtDateTime = (dt: string | null | undefined): { date: string; time: string } => {
  if (!dt) return { date: '—', time: '' };
  let datePart: string;
  let timePart = '';
  if (dt.includes('T')) {
    [datePart, timePart] = dt.split('T');
    timePart = timePart.substring(0, 5);
  } else if (dt.includes(' ')) {
    [datePart, timePart] = dt.split(' ');
    timePart = timePart.substring(0, 5);
  } else {
    datePart = dt;
  }
  const [y, m, day] = datePart.split('-');
  return { date: `${day}/${m}/${y}`, time: timePart };
};

/** Días completos entre `from` y `to` (o hoy si `to` está ausente); 0 si `from` es falsy. */
export const daysBetween = (
  from: string | null | undefined,
  to: string | null | undefined
): number => {
  if (!from) return 0;
  const start = new Date(from);
  const end = to ? new Date(to) : new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
};
