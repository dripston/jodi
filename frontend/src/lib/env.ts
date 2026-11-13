const raw = import.meta.env;

export const env = {
  apiBase: (typeof raw.VITE_API_BASE === 'string' && raw.VITE_API_BASE) || 'http://localhost:8000',
  useMock: raw.VITE_USE_MOCK === 'true',
} as const;
