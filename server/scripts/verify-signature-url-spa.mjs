import {
  buildCompletionUrl,
  resolveClientBaseUrl,
  isStaleCompletionUrl,
  generateCompletionToken,
} from '../services/completionToken.js';

process.env.NODE_ENV = 'production';
delete process.env.CLIENT_URL;
delete process.env.PUBLIC_SITE_URL;
delete process.env.FRONTEND_URL;

const token = generateCompletionToken().token;
const url = buildCompletionUrl(token);
const probeUrl = `https://www.americonfort.com/complete-booking/probe-${token.slice(0, 16)}`;

const spa = await fetch(probeUrl);
const html = await spa.text();

const report = {
  generatedShape: url.replace(token, '<token>'),
  origin: resolveClientBaseUrl(),
  staleLocalhost: isStaleCompletionUrl('http://localhost:5173/complete-booking/x'),
  spaStatus: spa.status,
  spaHasRoot: html.includes('id="root"'),
  spaHasAssets: html.includes('/assets/'),
};

console.log(JSON.stringify(report, null, 2));

if (!report.generatedShape.startsWith('https://www.americonfort.com/complete-booking/')) {
  console.error('FAIL: bad generated URL shape');
  process.exit(1);
}
if (!report.spaHasRoot || report.spaStatus !== 200) {
  console.error('FAIL: SPA did not serve complete-booking path');
  process.exit(1);
}
console.log('OK: generated URL shape + production SPA route verified');
