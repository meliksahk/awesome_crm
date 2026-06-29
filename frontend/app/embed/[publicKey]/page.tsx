'use client';
// app/embed/[publicKey]/page.tsx — 3. parti sitelere iframe ile gömülen PUBLIC lead formu.
// Auth gerektirmez; config'i public uçtan çeker, /public/.../submit'e gönderir (FORM kanalı).
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { LeadFormField } from '@/types';

interface PublicConfig {
  name: string;
  fields: LeadFormField[];
  buttonColor: string;
  buttonLabel: string;
  successMessage: string | null;
}

export default function EmbedFormPage({
  params,
}: {
  params: { publicKey: string };
}) {
  const { t } = useI18n();
  const [cfg, setCfg] = useState<PublicConfig | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>(
    'idle',
  );

  useEffect(() => {
    fetch(`/api/v1/public/lead-forms/${params.publicKey}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => setCfg(j.data as PublicConfig))
      .catch(() => setNotFound(true));
  }, [params.publicKey]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    try {
      const res = await fetch(
        `/api/v1/public/lead-forms/${params.publicKey}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        },
      );
      if (!res.ok) throw new Error('submit');
      const j = await res.json();
      const redirect = j.data?.redirectUrl as string | null;
      if (redirect) {
        window.location.href = redirect;
        return;
      }
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (notFound) {
    return (
      <main className="p-6 text-sm text-gray-600">{t('embed.notFound')}</main>
    );
  }
  if (!cfg) {
    return <main className="p-6 text-sm text-gray-400">…</main>;
  }
  if (state === 'done') {
    return (
      <main className="p-6 text-sm text-emerald-700">
        {cfg.successMessage || t('embed.thanks')}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-5">
      <h1 className="mb-4 text-lg font-semibold text-gray-800">{cfg.name}</h1>
      <form onSubmit={submit} className="space-y-3">
        {cfg.fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              {f.label}
              {f.required && <span className="text-red-500"> *</span>}
            </label>
            {f.type === 'textarea' ? (
              <textarea
                required={f.required}
                rows={3}
                value={values[f.key] ?? ''}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            ) : (
              <input
                type={f.type === 'number' ? 'number' : f.type ?? 'text'}
                required={f.required}
                value={values[f.key] ?? ''}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            )}
          </div>
        ))}
        {state === 'error' && (
          <p className="text-sm text-red-600">{t('embed.error')}</p>
        )}
        <button
          type="submit"
          disabled={state === 'sending'}
          style={{ backgroundColor: cfg.buttonColor }}
          className="w-full rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {state === 'sending'
            ? t('embed.sending')
            : cfg.buttonLabel || t('embed.send')}
        </button>
      </form>
    </main>
  );
}
