// src/modules/data/csv.util.spec.ts
import { parseCsv, toCsv } from './csv.util';

describe('csv.util', () => {
  it('toCsv: başlık + satırlar, gömülü virgül tırnaklanır', () => {
    const csv = toCsv(
      [{ name: 'Acme, Inc', city: 'İstanbul' }],
      [
        { key: 'name', header: 'Ad' },
        { key: 'city', header: 'Şehir' },
      ],
    );
    expect(csv).toBe('Ad,Şehir\r\n"Acme, Inc",İstanbul');
  });

  it('toCsv: gömülü tırnak "" ile kaçışlanır', () => {
    const csv = toCsv(
      [{ note: 'dedi ki "merhaba"' }],
      [{ key: 'note', header: 'Not' }],
    );
    expect(csv).toBe('Not\r\n"dedi ki ""merhaba"""');
  });

  it('parseCsv: başlık → nesne, tırnaklı/virgüllü alan', () => {
    const rows = parseCsv('Ad,Email\r\n"Acme, Inc",a@b.com\r\nBeta,b@b.com');
    expect(rows).toEqual([
      { Ad: 'Acme, Inc', Email: 'a@b.com' },
      { Ad: 'Beta', Email: 'b@b.com' },
    ]);
  });

  it('parseCsv: round-trip (toCsv → parseCsv)', () => {
    const data = [
      { name: 'X "Y"', email: 'x@y.com' },
      { name: 'A,B', email: '' },
    ];
    const csv = toCsv(data, [
      { key: 'name', header: 'name' },
      { key: 'email', header: 'email' },
    ]);
    expect(parseCsv(csv)).toEqual(data);
  });

  it('parseCsv: boş metin → boş dizi', () => {
    expect(parseCsv('')).toEqual([]);
  });
});
