/**
 * French amount-in-words for invoice previews (MAD / generic currency).
 */

const UNITS = [
  '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
];
const TENS = [
  '', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt',
];

const joinParts = (parts) => parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

const belowHundred = (n) => {
  if (n < 20) return UNITS[n];
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  if (ten === 7 || ten === 9) {
    const base = ten === 7 ? 'soixante' : 'quatre-vingt';
    const rest = n - (ten === 7 ? 60 : 80);
    if (ten === 9 && unit === 0) return 'quatre-vingts';
    if (rest === 1 && ten === 7) return `${base} et onze`;
    return `${base}-${belowHundred(rest)}`;
  }
  if (ten === 8) {
    if (unit === 0) return 'quatre-vingts';
    return `quatre-vingt-${UNITS[unit]}`;
  }
  if (unit === 0) return TENS[ten];
  if (unit === 1) return `${TENS[ten]} et un`;
  return `${TENS[ten]}-${UNITS[unit]}`;
};

const belowThousand = (n) => {
  if (n < 100) return belowHundred(n);
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const hundredWord = hundred === 1 ? 'cent' : `${UNITS[hundred]} cent${rest === 0 && hundred > 1 ? 's' : ''}`;
  if (rest === 0) return hundredWord;
  return `${hundred === 1 ? 'cent' : `${UNITS[hundred]} cent`} ${belowHundred(rest)}`;
};

const chunkToWords = (n) => {
  if (n === 0) return 'zéro';
  if (n < 1000) return belowThousand(n);
  const billion = Math.floor(n / 1_000_000_000);
  const million = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousand = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts = [];
  if (billion) parts.push(billion === 1 ? 'un milliard' : `${belowThousand(billion)} milliards`);
  if (million) parts.push(million === 1 ? 'un million' : `${belowThousand(million)} millions`);
  if (thousand) parts.push(thousand === 1 ? 'mille' : `${belowThousand(thousand)} mille`);
  if (rest) parts.push(belowThousand(rest));
  return joinParts(parts);
};

const currencyLabel = (code, { plural = false } = {}) => {
  const c = String(code || 'MAD').toUpperCase();
  if (c === 'MAD' || c === 'DH' || c === 'DHS') {
    return plural ? 'dirhams marocains' : 'dirham marocain';
  }
  if (c === 'EUR') return plural ? 'euros' : 'euro';
  if (c === 'USD') return plural ? 'dollars américains' : 'dollar américain';
  return plural ? c : c;
};

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const amountInWordsFr = (amount, currency = 'MAD') => {
  const n = Math.round((Number(amount) || 0) * 100) / 100;
  const whole = Math.floor(Math.abs(n));
  const cents = Math.round((Math.abs(n) - whole) * 100);
  const wholeWords = chunkToWords(whole);
  const major = currencyLabel(currency, { plural: whole === 0 || whole > 1 });
  let phrase = `${wholeWords} ${major}`;
  if (cents > 0) {
    const centWords = chunkToWords(cents);
    const centLabel = cents > 1 ? 'centimes' : 'centime';
    phrase += ` et ${centWords} ${centLabel}`;
  }
  if (n < 0) phrase = `moins ${phrase}`;
  return capitalize(phrase);
};

export const invoiceAmountInWordsSentence = (amount, currency = 'MAD') => {
  const words = amountInWordsFr(amount, currency);
  return `Arrêté la présente facture à la somme de : ${words}.`;
};

export default { amountInWordsFr, invoiceAmountInWordsSentence };
