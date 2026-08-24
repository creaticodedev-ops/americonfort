/**
 * Smoke-test professional XLSX workbook builder (no DB).
 * Run: node scripts/verify-xlsx-report.mjs
 */
import assert from 'assert';
import {
  resolveAgencyReportContext,
  buildAgencyWorkbook,
  buildDownloadFilename,
} from '../services/xlsxReport/workbook.js';

const agency = resolveAgencyReportContext({
  name: 'Test Owner',
  agencyName: 'Casa Rental Agency',
  agencyProfile: {
    legalName: 'Casa Rental SARL',
    phone: '212600000000',
    city: 'Casablanca',
    country: 'Morocco',
    address: 'Bd Anfa',
  },
});

assert.equal(agency.agencyName, 'Casa Rental Agency');
assert.ok(agency.moneyFormat.includes('MAD') || agency.currency);

const workbook = await buildAgencyWorkbook({
  agency,
  title: 'Reservations Report',
  subtitle: 'Smoke test',
  filters: [{ label: 'Status', value: 'confirmed' }],
  kpis: [
    { label: 'Rows', value: 2, format: 'number' },
    { label: 'Revenue', value: 1500, format: 'money' },
  ],
  sheets: [
    {
      name: 'Reservations',
      columns: [
        { key: 'id', header: 'Reservation #', width: 14 },
        { key: 'amount', header: 'Amount', width: 12, type: 'money' },
        { key: 'status', header: 'Status', width: 12, type: 'status' },
        { key: 'pickup', header: 'Pickup', width: 12, type: 'date' },
      ],
      rows: [
        { id: 'RES-1', amount: 500, status: 'confirmed', pickup: new Date('2026-01-10') },
        { id: 'RES-2', amount: 1000, status: 'pending', pickup: new Date('2026-01-12') },
      ],
      totals: { label: 'Totals', sumKeys: ['amount'] },
    },
  ],
});

const buf = await workbook.xlsx.writeBuffer();
assert.ok(buf.byteLength > 2000, 'workbook should produce a non-trivial XLSX buffer');
assert.match(buildDownloadFilename(agency.agencyName, 'reservations'), /casa-rental-agency-reservations-\d{4}-\d{2}-\d{2}\.xlsx/);

console.log('OK: xlsx report workbook smoke test passed', { bytes: buf.byteLength });
