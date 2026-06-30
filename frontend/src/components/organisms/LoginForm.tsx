'use client';
// src/components/organisms/LoginForm.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { FormField } from '../molecules/FormField';
import { Logo } from '../molecules/Logo';

export function LoginForm() {
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('admin@crm.dev');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error?.message
          ? err.response.data.error.message
          : t('login.error');
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-sm p-8">
      <div className="mb-4">
        <Logo size={36} textClass="text-xl text-gray-900" />
      </div>
      <p className="mb-6 text-sm text-gray-500">{t('login.title')}</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          id="email"
          label={t('login.email')}
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <FormField
          id="password"
          label={t('login.password')}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? '…' : t('login.submit')}
        </Button>
      </form>
    </Card>
  );
}
