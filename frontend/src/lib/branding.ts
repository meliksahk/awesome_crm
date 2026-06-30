'use client';
// src/lib/branding.ts — marka (logo + uygulama adı) public sorgusu.
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from './api';

export interface Branding {
  appName: string | null;
  logo: string | null; // data URL veya null
}

export function useBranding() {
  return useQuery({
    queryKey: ['branding'],
    queryFn: async () => unwrap<Branding>((await api.get('/branding')).data),
    staleTime: 60_000,
  });
}
