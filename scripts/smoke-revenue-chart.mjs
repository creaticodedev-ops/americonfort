/**
 * Smoke: chart money formatting + trend series shape (no DB).
 * Run: node scripts/smoke-revenue-chart.mjs
 */
import assert from 'node:assert/strict';

const formatChartMoney = (n, currency = 'MAD') => {
  const code = String(currency || 'MAD').replace(/\s+/g, '') || 'MAD';
  const formatted = Number(n || 0).toLocaleString('fr-FR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
  return `${formatted} ${code}`;
};

assert.equal(formatChartMoney(3300, 'MAD '), '3\u202f300 MAD');
assert.equal(formatChartMoney(0, 'MAD'), '0 MAD');
assert.equal(formatChartMoney(13846, 'MAD'), '13\u202f846 MAD');

// Simulate what unstyled markup looked like (regression guard conceptually)
const series = [
  { label: 'W1', amount: 3300 },
  { label: 'W2', amount: 1650 },
  { label: 'W3', amount: 0 },
];
const badConcat = series.map((s) => `MAD${s.amount}`).join('');
assert.equal(badConcat, 'MAD3300MAD1650MAD0');
const good = series.map((s) => formatChartMoney(s.amount)).join(' | ');
assert.ok(good.includes('3\u202f300 MAD'));
assert.ok(!good.includes('MAD3300'));

console.log('smoke-revenue-chart: ok');
