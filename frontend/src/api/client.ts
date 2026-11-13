import type { z } from 'zod';
import { env } from '@/lib/env';

export type HttpMethod = 'GET' | 'POST';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function transport(method: HttpMethod, path: string, body?: unknown): Promise<unknown> {
  if (env.useMock) {
    try {
      const { mockRequest } = await import('./mock/adapter');
      return await mockRequest(method, path, body);
    } catch (err) {
      const status = err instanceof Error && 'status' in err && typeof err.status === 'number' ? err.status : 500;
      throw new ApiError(`Request failed (${status})`, status, path);
    }
  }

  const isForm = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${env.apiBase}${path}`, {
      method,
      headers: isForm || body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the Jodi server', 0, path);
  }
  if (!response.ok) {
    throw new ApiError(`Request failed (${response.status})`, response.status, path);
  }
  return response.json();
}

export async function request<S extends z.ZodTypeAny>(
  schema: S,
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<z.output<S>> {
  const data = await transport(method, path, body);
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError('Unexpected response from the server', 200, path);
  }
  return parsed.data;
}
