import ExcelJS from 'exceljs';
import { getAgencyProfile } from '../agencyService.js';

const BRAND = {
  accent: 'FF7A1F2E',
  accentSoft: 'FFF4E8EB',
  ink: 'FF111827',
  muted: 'FF6B7280',
  border: 'FFE5E7EB',
  surface: 'FFF9FAFB',
  white: 'FFFFFFFF',
};

const STATUS_FILL = {
  confirmed: 'FFD1FAE5',
  paid: 'FFD1FAE5',
  completed: 'FFD1FAE5',
  active: 'FFDBEAFE',
  ready_for_pickup: 'FFE0E7FF',
  pending: 'FFFEF3C7',
  scheduled: 'FFFEF3C7',
  in_progress: 'FFDBEAFE',
  maintenance: 'FFFEF3C7',
  cancelled: 'FFFEE2E2',
  failed: 'FFFEE2E2',
  expired: 'FFF3F4F6',
  inactive: 'FFF3F4F6',
  offline: 'FFF3F4F6',
  hidden: 'FFF3F4F6',
  available: 'FFD1FAE5',
  booked: 'FFDBEAFE',
  rented: 'FFDBEAFE',
  visible: 'FFD1FAE5',
  vip: 'FFFEF3C7',
  blacklisted: 'FFFEE2E2',
  regular: 'FFF3F4F6',
  new: 'FFDBEAFE',
  signed: 'FFD1FAE5',
};

const titleCase = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const resolveAgencyReportContext = (user) => {
  const profile = getAgencyProfile(user);
  const agencyName =
    String(user?.agencyName || '').trim() ||
    String(profile.legalName || '').trim() ||
    String(user?.name || '').trim() ||
    'Agency';
  const currency = String(process.env.CURRENCY || 'MAD').toUpperCase();
  return {
    agencyName,
    legalName: profile.legalName || agencyName,
    phone: profile.phone || profile.whatsapp || '',
    address: [profile.address, profile.city, profile.country].filter(Boolean).join(', '),
    city: profile.city || '',
    country: profile.country || 'Morocco',
    currency,
    moneyFormat: `#,##0.00 "${currency}"`,
    percentFormat: '0.0%',
    dateFormat: 'YYYY-MM-DD',
    dateTimeFormat: 'YYYY-MM-DD HH:mm',
  };
};

const excelDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const asNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const slugify = (value) =>
  String(value || 'report')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'report';

const cellValue = (raw, col) => {
  const value = raw?.[col.key];
  if (value == null || value === '') {
    return col.type === 'money' || col.type === 'number' || col.type === 'percent' ? 0 : '';
  }
  if (col.type === 'date' || col.type === 'datetime') return excelDate(value);
  if (col.type === 'money' || col.type === 'number') return asNumber(value);
  if (col.type === 'percent') {
    const n = asNumber(value);
    return n > 1 ? n / 100 : n;
  }
  if (col.type === 'status') return titleCase(value);
  return value;
};

/**
 * Build a branded multi-section workbook for agency owners.
 */
export async function buildAgencyWorkbook({
  agency,
  title,
  subtitle = '',
  filters = [],
  kpis = [],
  sheets = [],
  orientation = 'landscape',
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = agency.agencyName;
  workbook.company = agency.agencyName;
  workbook.created = new Date();
  workbook.modified = new Date();

  const exportedAt = new Date();

  for (const sheetDef of sheets) {
    const columns = sheetDef.columns || [];
    const dataRows = sheetDef.rows || [];
    const colCount = Math.max(columns.length, 4);

    const ws = workbook.addWorksheet(String(sheetDef.name || 'Report').slice(0, 31), {
      properties: { defaultRowHeight: 18 },
      pageSetup: {
        orientation: sheetDef.orientation || orientation,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
        horizontalCentered: true,
        margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      },
      headerFooter: {
        oddHeader: `&L${agency.agencyName}&C${title}&R&D`,
        oddFooter: `&LConfidential — ${agency.agencyName}&C&P / &N&RAmericonfort`,
      },
    });

    columns.forEach((col, i) => {
      ws.getColumn(i + 1).width = col.width || 14;
    });

    let row = 1;

    ws.mergeCells(row, 1, row, colCount);
    ws.getCell(row, 1).value = agency.agencyName;
    ws.getCell(row, 1).font = { name: 'Calibri', size: 16, bold: true, color: { argb: BRAND.accent } };
    ws.getRow(row).height = 24;
    row += 1;

    ws.mergeCells(row, 1, row, colCount);
    ws.getCell(row, 1).value = title;
    ws.getCell(row, 1).font = { name: 'Calibri', size: 13, bold: true, color: { argb: BRAND.ink } };
    row += 1;

    if (subtitle) {
      ws.mergeCells(row, 1, row, colCount);
      ws.getCell(row, 1).value = subtitle;
      ws.getCell(row, 1).font = { name: 'Calibri', size: 10, color: { argb: BRAND.muted } };
      row += 1;
    }

    for (const line of [
      `Exported: ${exportedAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`,
      agency.address ? `Location: ${agency.address}` : null,
      agency.phone ? `Phone: ${agency.phone}` : null,
      `Currency: ${agency.currency}`,
    ].filter(Boolean)) {
      ws.mergeCells(row, 1, row, colCount);
      ws.getCell(row, 1).value = line;
      ws.getCell(row, 1).font = { name: 'Calibri', size: 9, color: { argb: BRAND.muted } };
      row += 1;
    }

    const activeFilters = (filters || []).filter((f) => f.value != null && String(f.value).trim() !== '');
    if (activeFilters.length) {
      row += 1;
      ws.getCell(row, 1).value = 'Applied filters';
      ws.getCell(row, 1).font = { bold: true, size: 10, color: { argb: BRAND.ink } };
      row += 1;
      for (const f of activeFilters) {
        ws.getCell(row, 1).value = f.label;
        ws.getCell(row, 1).font = { size: 9, color: { argb: BRAND.muted } };
        ws.getCell(row, 2).value = String(f.value);
        ws.getCell(row, 2).font = { size: 9, color: { argb: BRAND.ink } };
        row += 1;
      }
    }

    if (kpis?.length) {
      row += 1;
      ws.getCell(row, 1).value = 'Summary';
      ws.getCell(row, 1).font = { bold: true, size: 10, color: { argb: BRAND.ink } };
      row += 1;
      const kpiStart = row;
      kpis.forEach((kpi, i) => {
        const col = (i % 4) * 2 + 1;
        const r = kpiStart + Math.floor(i / 4) * 2;
        ws.getCell(r, col).value = kpi.label;
        ws.getCell(r, col).font = { size: 8, bold: true, color: { argb: BRAND.muted } };
        ws.getCell(r, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.accentSoft } };
        const valueCell = ws.getCell(r + 1, col);
        valueCell.value = kpi.value;
        valueCell.font = { size: 12, bold: true, color: { argb: BRAND.ink } };
        valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.accentSoft } };
        if (kpi.format === 'money') valueCell.numFmt = agency.moneyFormat;
        if (kpi.format === 'percent') valueCell.numFmt = agency.percentFormat;
        if (kpi.format === 'number') valueCell.numFmt = '#,##0';
        ws.mergeCells(r, col, r, col + 1);
        ws.mergeCells(r + 1, col, r + 1, col + 1);
      });
      row = kpiStart + Math.ceil(kpis.length / 4) * 2;
    }

    row += 1;
    if (sheetDef.sectionTitle) {
      ws.getCell(row, 1).value = sheetDef.sectionTitle;
      ws.getCell(row, 1).font = { bold: true, size: 11, color: { argb: BRAND.ink } };
      row += 1;
    }

    const headerRowIndex = row;
    const dataStartRow = headerRowIndex + 1;
    const lastDataRow = headerRowIndex + Math.max(dataRows.length, 0);

    if (columns.length) {
      const endColLetter = ws.getColumn(columns.length).letter;
      const tableRef = `A${headerRowIndex}:${endColLetter}${Math.max(lastDataRow, headerRowIndex)}`;

      if (dataRows.length) {
        try {
          ws.addTable({
            name: `Report_${slugify(sheetDef.name).replace(/-/g, '_')}_${headerRowIndex}`,
            ref: tableRef,
            headerRow: true,
            totalsRow: false,
            style: { theme: 'TableStyleMedium9', showRowStripes: true },
            columns: columns.map((c) => ({ name: String(c.header).slice(0, 255), filterButton: true })),
            rows: dataRows.map((raw) => columns.map((col) => cellValue(raw, col))),
          });
        } catch {
          // Manual grid + autoFilter fallback
          columns.forEach((col, i) => {
            const cell = ws.getCell(headerRowIndex, i + 1);
            cell.value = col.header;
          });
          dataRows.forEach((raw, rIdx) => {
            columns.forEach((col, cIdx) => {
              ws.getCell(dataStartRow + rIdx, cIdx + 1).value = cellValue(raw, col);
            });
          });
          ws.autoFilter = {
            from: { row: headerRowIndex, column: 1 },
            to: { row: lastDataRow, column: columns.length },
          };
        }
      } else {
        columns.forEach((col, i) => {
          ws.getCell(headerRowIndex, i + 1).value = col.header;
        });
      }

      columns.forEach((col, cIdx) => {
        const headerCell = ws.getCell(headerRowIndex, cIdx + 1);
        headerCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: BRAND.white } };
        headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.accent } };
        headerCell.alignment = { vertical: 'middle', wrapText: true };

        for (let rIdx = 0; rIdx < dataRows.length; rIdx += 1) {
          const cell = ws.getCell(dataStartRow + rIdx, cIdx + 1);
          cell.font = { name: 'Calibri', size: 10, color: { argb: BRAND.ink } };
          cell.alignment = { vertical: 'middle', wrapText: Boolean(col.wrap) };
          if (col.type === 'date') cell.numFmt = agency.dateFormat;
          if (col.type === 'datetime') cell.numFmt = agency.dateTimeFormat;
          if (col.type === 'money') cell.numFmt = agency.moneyFormat;
          if (col.type === 'number') cell.numFmt = col.numFmt || '#,##0';
          if (col.type === 'percent') cell.numFmt = agency.percentFormat;
          if (col.type === 'status') {
            const fill = STATUS_FILL[String(dataRows[rIdx][col.key] || '').toLowerCase()];
            if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
          }
        }
      });
      ws.getRow(headerRowIndex).height = 22;
    }

    if (sheetDef.totals && dataRows.length) {
      const totalRow = lastDataRow + 1;
      columns.forEach((col, cIdx) => {
        const cell = ws.getCell(totalRow, cIdx + 1);
        cell.font = { bold: true, size: 10, color: { argb: BRAND.ink } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.accentSoft } };
        if (cIdx === 0) cell.value = sheetDef.totals.label || 'Totals';
        else if (sheetDef.totals.sumKeys?.includes(col.key)) {
          const colLetter = ws.getColumn(cIdx + 1).letter;
          cell.value = { formula: `SUM(${colLetter}${dataStartRow}:${colLetter}${lastDataRow})` };
          if (col.type === 'money') cell.numFmt = agency.moneyFormat;
          if (col.type === 'number') cell.numFmt = '#,##0';
        }
      });
    }

    ws.views = [{ state: 'frozen', ySplit: headerRowIndex, activeCell: `A${dataStartRow}` }];
    ws.pageSetup.printTitlesRow = `${headerRowIndex}:${headerRowIndex}`;
  }

  return workbook;
}

export const buildDownloadFilename = (agencyName, reportKey) => {
  const date = new Date().toISOString().slice(0, 10);
  return `${slugify(agencyName)}-${slugify(reportKey)}-${date}.xlsx`;
};

export const sendWorkbook = async (res, workbook, filename) => {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
};

export const filterLines = (entries) =>
  Object.entries(entries)
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([label, value]) => ({ label, value: String(value) }));

export const rentalDays = (pickup, ret) => {
  const a = excelDate(pickup);
  const b = excelDate(ret);
  if (!a || !b) return 0;
  const ms = Math.max(0, b.getTime() - a.getTime());
  return Math.max(1, Math.ceil(ms / 86400000));
};

export { titleCase, asNumber, excelDate, BRAND };
