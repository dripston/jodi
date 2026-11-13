import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type MotherFilters } from './endpoints';
import type { CallPurpose, RegisterInput, Ticket, TicketState } from './schemas';

const LIVE = { refetchInterval: 2000, staleTime: 1000 } as const;

export const queryKeys = {
  all: ['jodi'] as const,
  mothers: (filters: MotherFilters = {}) => ['jodi', 'mothers', filters] as const,
  mother: (id: string) => ['jodi', 'mother', id] as const,
  timeline: (id: string) => ['jodi', 'timeline', id] as const,
  audit: (id: string) => ['jodi', 'audit', id] as const,
  vitals: (id: string) => ['jodi', 'vitals', id] as const,
  summary: (id: string) => ['jodi', 'summary', id] as const,
  motherCalls: (id: string) => ['jodi', 'mother-calls', id] as const,
  tickets: (state?: TicketState) => ['jodi', 'tickets', state ?? 'all'] as const,
  ashas: ['jodi', 'ashas'] as const,
  ashaList: (id: string) => ['jodi', 'asha-list', id] as const,
  photoJob: (id: string) => ['jodi', 'photo-job', id] as const,
  recentCalls: ['jodi', 'calls', 'recent'] as const,
  call: (id: string) => ['jodi', 'call', id] as const,
  stats: ['jodi', 'stats'] as const,
  statusByDay: ['jodi', 'stats', 'status-by-day'] as const,
  plannedCalls: (id: string) => ['jodi', 'planned-calls', id] as const,
  facilities: (id: string) => ['jodi', 'facilities', id] as const,
};

export const useMothers = (filters: MotherFilters = {}) =>
  useQuery({
    queryKey: queryKeys.mothers(filters),
    queryFn: () => api.getMothers(filters),
    placeholderData: keepPreviousData,
    ...LIVE,
  });

export const useMother = (id: string) =>
  useQuery({ queryKey: queryKeys.mother(id), queryFn: () => api.getMother(id), ...LIVE });

export const useTimeline = (id: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.timeline(id),
    queryFn: () => api.getTimeline(id),
    enabled: enabled && id !== '',
    ...LIVE,
  });

export const useAudit = (id: string) =>
  useQuery({ queryKey: queryKeys.audit(id), queryFn: () => api.getAudit(id), ...LIVE });

export const useVitals = (id: string) =>
  useQuery({ queryKey: queryKeys.vitals(id), queryFn: () => api.getVitals(id), ...LIVE });

export const useSummary = (id: string, enabled = true) =>
  useQuery({ queryKey: queryKeys.summary(id), queryFn: () => api.getSummary(id), enabled });

export const useMotherCalls = (id: string) =>
  useQuery({ queryKey: queryKeys.motherCalls(id), queryFn: () => api.getMotherCalls(id), ...LIVE });

export const useTickets = (state?: TicketState) =>
  useQuery({ queryKey: queryKeys.tickets(state), queryFn: () => api.getTickets(state), ...LIVE });

export const useOpenTickets = () => useTickets('open');

export const useAshas = () =>
  useQuery({ queryKey: queryKeys.ashas, queryFn: api.getAshas, ...LIVE });

export const useAshaList = (id: string) =>
  useQuery({ queryKey: queryKeys.ashaList(id), queryFn: () => api.getAshaList(id), ...LIVE });

export const usePhotoJob = (jobId: string | null) =>
  useQuery({
    queryKey: queryKeys.photoJob(jobId ?? 'none'),
    queryFn: () => api.getPhotoJob(jobId ?? ''),
    enabled: jobId !== null,
    refetchInterval: (q) => (q.state.data?.status === 'done' ? false : 1500),
  });

export const useRecentCalls = () =>
  useQuery({ queryKey: queryKeys.recentCalls, queryFn: api.getRecentCalls, ...LIVE });

export const useCall = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.call(id ?? 'none'),
    queryFn: () => api.getCall(id ?? ''),
    enabled: id !== null,
  });

export const useStats = () => useQuery({ queryKey: queryKeys.stats, queryFn: api.getStats, ...LIVE });

export const useStatusByDay = () =>
  useQuery({ queryKey: queryKeys.statusByDay, queryFn: api.getStatusByDay, ...LIVE });

/* ---------- mutations ---------- */

type TicketAction = 'ack' | 'reached';

/** Optimistic ticket transition with rollback on error. */
export function useTicketAction(action: TicketAction) {
  const qc = useQueryClient();
  const nextState: TicketState = action === 'ack' ? 'acknowledged' : 'reached';
  return useMutation({
    mutationFn: ({ ticketId, by }: { ticketId: string; by: string }) =>
      action === 'ack' ? api.ackTicket(ticketId, by) : api.reachedTicket(ticketId, by),
    onMutate: async ({ ticketId, by }) => {
      await qc.cancelQueries({ queryKey: ['jodi', 'tickets'] });
      const snapshot = qc.getQueriesData<Ticket[]>({ queryKey: ['jodi', 'tickets'] });
      const at = new Date().toISOString();
      qc.setQueriesData<Ticket[]>({ queryKey: ['jodi', 'tickets'] }, (old) =>
        old?.map((t) =>
          t.id === ticketId
            ? { ...t, state: nextState, history: [...t.history, { at, state: nextState, by, note: '' }] }
            : t,
        ),
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.all }),
  });
}

function useInvalidatingMutation<V, R>(fn: (vars: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.all }),
  });
}

export const useStartCall = () =>
  useInvalidatingMutation(({ motherId, purpose }: { motherId: string; purpose: CallPurpose }) =>
    api.startCall(motherId, purpose),
  );

export const useUploadPhoto = () =>
  useMutation({ mutationFn: ({ file, phone }: { file: File; phone: string }) => api.uploadPhoto(file, phone) });

export const useDemoReset = () => useInvalidatingMutation(() => api.demoReset());

export const useDemoAdvanceDay = () =>
  useInvalidatingMutation(({ motherId, days }: { motherId: string; days: number }) =>
    api.demoAdvanceDay(motherId, days),
  );

export const useDemoInject = () =>
  useInvalidatingMutation(
    ({ motherId, callerPhone, transcript }: { motherId: string; callerPhone: string; transcript: string }) =>
      api.demoInject(motherId, callerPhone, transcript),
  );

export const usePlannedCalls = (id: string) =>
  useQuery({ queryKey: queryKeys.plannedCalls(id), queryFn: () => api.getPlannedCalls(id), ...LIVE });

export const useFacilities = (id: string) =>
  useQuery({ queryKey: queryKeys.facilities(id), queryFn: () => api.getFacilities(id), ...LIVE });

export const useRegister = () => useInvalidatingMutation((input: RegisterInput) => api.register(input));

export const useShareRecord = () =>
  useInvalidatingMutation(({ motherId, by }: { motherId: string; by: string }) => api.shareRecord(motherId, by));
