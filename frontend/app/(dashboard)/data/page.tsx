'use client';
// app/(dashboard)/data/page.tsx — v2.8 Veri: CSV dışa aktar + içe aktar + yinelenenler.
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Textarea } from '@/components/atoms/Textarea';

interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export default function DataPage() {
  const { can } = useAuth();
  const [entity, setEntity] = useState<'contacts' | 'companies'>('contacts');
  const [csv, setCsv] = useState('');

  // Dışa aktarma: token'lı blob indir.
  async function exportCsv(which: 'contacts' | 'companies' | 'deals') {
    const res = await api.get(`/data/export/${which}`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${which}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const importMut = useMutation({
    mutationFn: async () =>
      unwrap<ImportResult>(
        (await api.post(`/data/import/${entity}`, { csv })).data,
      ),
  });

  return (
    <DashboardTemplate title="Veri">
      {can('data.export') && (
        <Card className="mb-4 p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            CSV dışa aktar
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => exportCsv('contacts')}>
              Kişiler
            </Button>
            <Button variant="secondary" onClick={() => exportCsv('companies')}>
              Şirketler
            </Button>
            <Button variant="secondary" onClick={() => exportCsv('deals')}>
              Anlaşmalar
            </Button>
          </div>
        </Card>
      )}

      {can('data.import') && (
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            CSV içe aktar (dedup ile)
          </h3>
          <div className="mb-2 flex items-center gap-2">
            <select
              value={entity}
              onChange={(e) =>
                setEntity(e.target.value as 'contacts' | 'companies')
              }
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="contacts">Kişiler</option>
              <option value="companies">Şirketler</option>
            </select>
            <span className="text-xs text-gray-500">
              {entity === 'contacts'
                ? 'Başlık: firstName,lastName,email,phone,title'
                : 'Başlık: name,domain,industry,phone,website'}
            </span>
          </div>
          <Textarea
            rows={6}
            placeholder="CSV içeriğini yapıştırın (ilk satır başlık)"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            className="mb-2 font-mono"
          />
          <Button
            onClick={() => importMut.mutate()}
            disabled={importMut.isPending || csv.trim().length === 0}
          >
            {importMut.isPending ? 'İçe aktarılıyor…' : 'İçe aktar'}
          </Button>
          {importMut.data && (
            <div className="mt-2 rounded-md bg-gray-50 p-3 text-sm">
              <p className="text-gray-700">
                Oluşturulan: {importMut.data.created} · Atlanan (dedup):{' '}
                {importMut.data.skipped} · Hata: {importMut.data.errors.length}
              </p>
              {importMut.data.errors.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
                  {importMut.data.errors.map((e, i) => (
                    <li key={i}>
                      Satır {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {importMut.isError && (
            <p className="mt-2 text-sm text-red-600">İçe aktarma başarısız.</p>
          )}
        </Card>
      )}
    </DashboardTemplate>
  );
}
