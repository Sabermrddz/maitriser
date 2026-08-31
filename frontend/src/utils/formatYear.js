export function formatYearLabel(year) {
  const n = Number(year);
  if (n === 7) return 'Résidanat';
  return n;
}
