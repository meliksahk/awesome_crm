// src/modules/data/csv.util.ts
// Bağımsız CSV ayrıştır/üret (harici bağımlılık yok). RFC4180 benzeri: tırnaklı
// alanlar, gömülü virgül/yeni satır ve "" kaçışı desteklenir. Saf fonksiyonlar.

// Bir hücreyi gerekiyorsa tırnakla.
function escapeCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Nesne dizisini CSV metnine çevirir. columns sırayı/başlığı belirler.
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T & string; header: string }[],
): string {
  const head = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows.map((r) =>
    columns.map((c) => escapeCell(r[c.key])).join(','),
  );
  return [head, ...body].join('\r\n');
}

// CSV metnini başlık satırına göre nesne dizisine ayrıştırır.
export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseRows(text);
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (cells[i] ?? '').trim();
    });
    return obj;
  });
}

// Ham CSV'yi satır → hücre dizisine böler (tırnak durumlu makine).
function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let cell = '';
  let row: string[] = [];
  let inQuotes = false;
  // BOM temizle.
  const s = text.replace(/^﻿/, '');

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      // \r\n tek satır sonu say.
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      // Boş satırları atla.
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  // Son hücre/satır.
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}
