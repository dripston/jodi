import { z } from 'zod';
import { request } from './client';
import {
  AshaListItemSchema,
  AshaSchema,
  AuditSchema,
  CallDetailSchema,
  CallLogSchema,
  CallStartedSchema,
  EntrySchema,
  InjectResultSchema,
  MotherDetailSchema,
  MotherSchema,
  OkSchema,
  OnboardingJobSchema,
  StatsSchema,
  StatusByDaySchema,
  SummarySchema,
  TicketSchema,
  VitalsSchema,
  type CallPurpose,
  type Level,
  type TicketState,
} from './schemas';

export interface MotherFilters {
  status?: Level;
  asha_id?: string;
  high_risk?: boolean;
  q?: string;
  day_min?: number;
  day_max?: number;
}

function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

const id = encodeURIComponent;

export const api = {
  getMothers: (filters: MotherFilters = {}) =>
    request(z.array(MotherSchema), 'GET', `/api/mothers${query({ ...filters })}`),
  getMother: (motherId: string) => request(MotherDetailSchema, 'GET', `/api/mothers/${id(motherId)}`),
  getTimeline: (motherId: string) =>
    request(z.array(EntrySchema), 'GET', `/api/mothers/${id(motherId)}/timeline`),
  getAudit: (motherId: string) => request(AuditSchema, 'GET', `/api/mothers/${id(motherId)}/audit`),
  getVitals: (motherId: string) => request(VitalsSchema, 'GET', `/api/mothers/${id(motherId)}/vitals`),
  getSummary: (motherId: string) =>
    request(SummarySchema, 'GET', `/api/mothers/${id(motherId)}/summary`),
  getMotherCalls: (motherId: string) =>
    request(z.array(CallLogSchema), 'GET', `/api/mothers/${id(motherId)}/calls`),
  getTickets: (state?: TicketState) =>
    request(z.array(TicketSchema), 'GET', `/api/tickets${query({ state })}`),
  ackTicket: (ticketId: string, by: string, note = '') =>
    request(TicketSchema, 'POST', `/api/tickets/${id(ticketId)}/ack`, { by, note }),
  reachedTicket: (ticketId: string, by: string, note = '') =>
    request(TicketSchema, 'POST', `/api/tickets/${id(ticketId)}/reached`, { by, note }),
  getAshas: () => request(z.array(AshaSchema), 'GET', '/api/ashas'),
  getAshaList: (ashaId: string) =>
    request(z.array(AshaListItemSchema), 'GET', `/api/asha/${id(ashaId)}/list`),
  uploadPhoto: (file: File, phone: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('phone', phone);
    return request(OnboardingJobSchema, 'POST', '/api/onboarding/photo', form);
  },
  getPhotoJob: (jobId: string) =>
    request(OnboardingJobSchema, 'GET', `/api/onboarding/photo/${id(jobId)}`),
  startCall: (motherId: string, purpose: CallPurpose) =>
    request(CallStartedSchema, 'POST', '/api/calls', { mother_id: motherId, purpose }),
  getRecentCalls: () => request(z.array(CallLogSchema), 'GET', '/api/calls/recent'),
  getCall: (interactionId: string) =>
    request(CallDetailSchema, 'GET', `/api/calls/${id(interactionId)}`),
  getStats: () => request(StatsSchema, 'GET', '/api/stats'),
  getStatusByDay: () => request(StatusByDaySchema, 'GET', '/api/stats/status-by-day'),
  demoReset: () => request(OkSchema, 'POST', '/api/demo/reset'),
  demoAdvanceDay: (motherId: string, days: number) =>
    request(MotherSchema, 'POST', '/api/demo/advance-day', { mother_id: motherId, days }),
  demoInject: (motherId: string, callerPhone: string, transcript: string) =>
    request(InjectResultSchema, 'POST', '/api/demo/inject', {
      mother_id: motherId,
      caller_phone: callerPhone,
      transcript,
    }),
};
