// src/common/interceptors/transform.interceptor.ts
// Başarılı yanıtları standart zarfa sarar: { success: true, data, meta? }.
// Servis { data, meta } döndürürse meta üst seviyeye taşınır.
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  StandardResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((payload) => {
        if (
          payload &&
          typeof payload === 'object' &&
          'data' in payload &&
          'meta' in payload
        ) {
          const { data, meta } = payload as {
            data: T;
            meta: Record<string, unknown>;
          };
          return { success: true, data, meta };
        }
        return { success: true, data: payload as T };
      }),
    );
  }
}
