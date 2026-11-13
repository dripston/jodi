import { useMemo } from 'react';
import { useAshas, useMothers } from './queries';
import type { Asha, Mother } from './schemas';

/** Lookup maps for joining tickets / calls / ASHA lists to people. */
export function useMotherIndex(): Map<string, Mother> {
  const { data } = useMothers();
  return useMemo(() => new Map((data ?? []).map((m) => [m.id, m])), [data]);
}

export function useAshaIndex(): Map<string, Asha> {
  const { data } = useAshas();
  return useMemo(() => new Map((data ?? []).map((a) => [a.id, a])), [data]);
}
