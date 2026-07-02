// src/modules/whatsapp/graph-client.ts
// Meta Graph API HTTP soyutlaması (testte stub'lanabilir; e2e ağa çıkmaz).
import { Injectable } from '@nestjs/common';

export const WA_GRAPH_CLIENT = Symbol('WA_GRAPH_CLIENT');

export interface GraphResponse {
  status: number;
  body: string;
}

export interface IGraphClient {
  post(
    url: string,
    body: unknown,
    headers: Record<string, string>,
  ): Promise<GraphResponse>;
}

@Injectable()
export class FetchGraphClient implements IGraphClient {
  async post(
    url: string,
    body: unknown,
    headers: Record<string, string>,
  ): Promise<GraphResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      return { status: res.status, body: await res.text() };
    } finally {
      clearTimeout(timer);
    }
  }
}
