
export const DESCRIPTION_STRING =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ac risus sed turpis vulputate interdum.';

export function getRandomPaymentDate(initResponseBody: {
  glCalendar?: { currentStart?: string; postaheadStart?: string };
}): string {
  const cal = initResponseBody?.glCalendar ?? {};
  const start = cal.currentStart ? new Date(cal.currentStart) : new Date();
  const end = cal.postaheadStart ? new Date(cal.postaheadStart) : new Date(start.getTime() + 86400_000);
  const t = start.getTime() + Math.random() * Math.max(0, end.getTime() - start.getTime());
  const d = new Date(t);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}-${d.getFullYear()}`;
}
