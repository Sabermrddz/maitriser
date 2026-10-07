export function formatYearLabel(year) {
  const n = Number(year);
  if (n === 7) return 'Résidanat';
  return n;
}

export function formatYearOrdinal(year, lang) {
  const n = Number(year);
  if (lang === 'fr') return n === 1 ? '1re' : `${n}e`;
  return String(n);
}
