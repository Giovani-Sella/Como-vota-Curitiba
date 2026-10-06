// Módulo de formatação numérica em pt-BR.
// Usar sempre estas funções para exibir números; nunca toFixed nem toLocaleString avulso.

// 1234567 → "1.234.567"
function fmtInteiro(v) {
  if (v === null || v === undefined) return '—';
  const n = +v;
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('pt-BR').format(Math.round(n));
}

// v em escala 0–100 (já multiplicado por 100): 34.56 → "34,6%"
function fmtPorcentagem(v) {
  if (v === null || v === undefined) return '—';
  const n = +v;
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(n) + '%';
}

// 1902.94 → "R$ 1.902,94"
function fmtDinheiro(v) {
  const n = parseFloat(v);
  if (isNaN(n) || n <= 0) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

// 45.21 → "45,2"  (1 casa decimal, sem símbolo — ex.: densidade)
function fmtDecimal(v) {
  if (v === null || v === undefined) return '—';
  const n = +v;
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(n);
}
