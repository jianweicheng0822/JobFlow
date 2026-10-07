import type {
  CompanyDTO,
  JobApplicationDTO,
  DashboardStatsDTO,
  ApplicationActivityDTO,
  InterviewDTO,
  ApplicationStatus,
  InterviewType,
} from './types';
import { todayLocal, browserTimeZone } from '../utils/date';

// ===== Dates relative to today =====
// The seed data was written around late July 2026. Shifting it by however many
// days have passed since keeps the demo looking current whenever it's opened.
const SEED_ANCHOR = '2026-07-27';

function daysSinceAnchor(now: Date = new Date()): number {
  const [y, m, d] = SEED_ANCHOR.split('-').map(Number);
  const anchor = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - anchor.getTime()) / 86400000);
}

// "2026-07-15" or "2026-07-15T10:00:00Z", moved forward by `days`
function shiftDate(value: string, days: number): string {
  if (value.length === 10) {
    const [y, m, d] = value.split('-').map(Number);
    return todayLocal(new Date(y, m - 1, d + days));
  }
  const shifted = new Date(value);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().replace('.000Z', 'Z');
}

// Local wall-clock date-time `days` from today, in the backend's format ("2026-10-08T10:00:00")
function localDateTimeIn(days: number, hour: number, minute = 0): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, minute);
  return `${todayLocal(d)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

// Calendar days from the user's today to the interview's day, like the backend (today = 0)
export function daysUntilLocal(interviewDate: string, now: Date = new Date()): number {
  const target = new Date(interviewDate);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86400000);
}

// Factory functions that return fresh seed data every time
function createSeedCompanies(): CompanyDTO[] {
  return [
    { id: 1, name: 'Google', logoUrl: null, location: 'Seattle, WA', website: 'https://google.com' },
    { id: 2, name: 'Spotify', logoUrl: null, location: 'Stockholm', website: 'https://spotify.com' },
    { id: 3, name: 'Meta', logoUrl: null, location: 'Menlo Park, CA', website: 'https://meta.com' },
    { id: 4, name: 'Amazon', logoUrl: null, location: 'Seattle, WA', website: 'https://amazon.com' },
    { id: 5, name: 'Apple', logoUrl: null, location: 'Cupertino, CA', website: 'https://apple.com' },
    { id: 6, name: 'Netflix', logoUrl: null, location: 'Los Gatos, CA', website: 'https://netflix.com' },
    { id: 7, name: 'Microsoft', logoUrl: null, location: 'Redmond, WA', website: 'https://microsoft.com' },
  ];
}

function createSeedApplications(companies: CompanyDTO[]): JobApplicationDTO[] {
  const offset = daysSinceAnchor();
  const seed: JobApplicationDTO[] = [
    {
      id: 1, positionTitle: 'Senior UX Designer', company: companies[0],
      location: 'Seattle, WA', salary: '$145,000', status: 'APPLIED',
      appliedDate: '2026-07-15', lastAction: 'Applied', notes: null,
      createdAt: '2026-07-15T10:00:00Z', updatedAt: '2026-07-15T10:00:00Z', starred: false,
    },
    {
      id: 2, positionTitle: 'Frontend Engineer', company: companies[1],
      location: 'Stockholm', salary: '$120,000', status: 'APPLIED',
      appliedDate: '2026-07-18', lastAction: 'Applied', notes: null,
      createdAt: '2026-07-18T09:00:00Z', updatedAt: '2026-07-18T09:00:00Z', starred: false,
    },
    {
      id: 3, positionTitle: 'Product Manager', company: companies[2],
      location: 'Menlo Park, CA', salary: '$160,000', status: 'IN_REVIEW',
      appliedDate: '2026-07-10', lastAction: 'Recruiter contacted', notes: null,
      createdAt: '2026-07-10T08:00:00Z', updatedAt: '2026-07-20T14:00:00Z', starred: false,
    },
    {
      id: 4, positionTitle: 'Software Engineer', company: companies[3],
      location: 'Seattle, WA', salary: '$155,000', status: 'PHONE_SCREEN',
      appliedDate: '2026-07-05', lastAction: 'Phone screen scheduled', notes: null,
      createdAt: '2026-07-05T11:00:00Z', updatedAt: '2026-07-22T09:00:00Z', starred: false,
    },
    {
      id: 5, positionTitle: 'Senior Frontend Engineer', company: companies[4],
      location: 'Cupertino, CA', salary: '$170,000', status: 'INTERVIEW',
      appliedDate: '2026-06-28', lastAction: 'Interview Scheduled', notes: 'Onsite round 2',
      createdAt: '2026-06-28T10:00:00Z', updatedAt: '2026-07-25T16:00:00Z', starred: true,
    },
    {
      id: 6, positionTitle: 'Full Stack Developer', company: companies[5],
      location: 'Los Gatos, CA', salary: '$140,000', status: 'OFFER',
      appliedDate: '2026-06-15', lastAction: 'Offer received', notes: 'Negotiating salary',
      createdAt: '2026-06-15T09:00:00Z', updatedAt: '2026-07-26T10:00:00Z', starred: false,
    },
    {
      id: 7, positionTitle: 'Backend Engineer', company: companies[6],
      location: 'Redmond, WA', salary: '$150,000', status: 'REJECTED',
      appliedDate: '2026-06-20', lastAction: 'Rejected after final round', notes: null,
      createdAt: '2026-06-20T08:00:00Z', updatedAt: '2026-07-18T12:00:00Z', starred: false,
    },
    {
      id: 8, positionTitle: 'Data Analyst', company: companies[0],
      location: 'Seattle, WA', salary: '$125,000', status: 'IN_REVIEW',
      appliedDate: '2026-07-12', lastAction: 'Resume reviewed', notes: null,
      createdAt: '2026-07-12T10:00:00Z', updatedAt: '2026-07-21T11:00:00Z', starred: true,
    },
    {
      id: 9, positionTitle: 'DevOps Engineer', company: companies[3],
      location: 'Seattle, WA', salary: '$135,000', status: 'APPLIED',
      appliedDate: '2026-07-22', lastAction: 'Applied', notes: null,
      createdAt: '2026-07-22T14:00:00Z', updatedAt: '2026-07-22T14:00:00Z', starred: false,
    },
    {
      id: 10, positionTitle: 'UX Researcher', company: companies[2],
      location: 'Menlo Park, CA', salary: '$130,000', status: 'REJECTED',
      appliedDate: '2026-06-10', lastAction: 'Rejected', notes: null,
      createdAt: '2026-06-10T09:00:00Z', updatedAt: '2026-07-01T15:00:00Z', starred: false,
    },
  ];
  return seed.map((app) => ({
    ...app,
    appliedDate: app.appliedDate && shiftDate(app.appliedDate, offset),
    createdAt: shiftDate(app.createdAt, offset),
    updatedAt: shiftDate(app.updatedAt, offset),
  }));
}

function createSeedInterviews(): InterviewDTO[] {
  return [
    {
      id: 1, jobApplicationId: 5, positionTitle: 'Senior Frontend Engineer',
      companyName: 'Apple', interviewDate: localDateTimeIn(2, 10),
      interviewType: 'ONSITE', notes: 'Bring portfolio',
      reminderEnabled: true, reminderHoursBefore: 24, reminderSent: false, daysUntil: 2,
    },
    {
      id: 2, jobApplicationId: 4, positionTitle: 'Software Engineer',
      companyName: 'Amazon', interviewDate: localDateTimeIn(1, 14),
      interviewType: 'PHONE', notes: 'Behavioral + coding',
      reminderEnabled: true, reminderHoursBefore: 24, reminderSent: false, daysUntil: 1,
    },
    {
      id: 3, jobApplicationId: 3, positionTitle: 'Product Manager',
      companyName: 'Meta', interviewDate: localDateTimeIn(5, 9),
      interviewType: 'VIDEO', notes: 'Case study round',
      reminderEnabled: false, reminderHoursBefore: 24, reminderSent: false, daysUntil: 5,
    },
  ];
}

function createSeedActivity(): ApplicationActivityDTO[] {
  return [
    { month: 'Jan', count: 3 },
    { month: 'Feb', count: 5 },
    { month: 'Mar', count: 8 },
    { month: 'Apr', count: 6 },
    { month: 'May', count: 10 },
    { month: 'Jun', count: 7 },
    { month: 'Jul', count: 4 },
  ];
}

// Same numbers as JobApplicationService.getStats: interviews means INTERVIEW only,
// and rates are percentages with one decimal
function computeStats(apps: JobApplicationDTO[]): DashboardStatsDTO {
  const total = apps.length;
  const interviews = apps.filter(a => a.status === 'INTERVIEW').length;
  const offers = apps.filter(a => a.status === 'OFFER').length;
  const rate = (count: number) => (total > 0 ? Math.round((count * 1000) / total) / 10 : 0);
  return {
    totalApplications: total,
    inReview: apps.filter(a => a.status === 'IN_REVIEW').length,
    interviews,
    offers,
    rejections: apps.filter(a => a.status === 'REJECTED').length,
    interviewRate: rate(interviews),
    offerRate: rate(offers),
  };
}

// Mutable working copies that CRUD operations modify
let companies: CompanyDTO[] = createSeedCompanies();
let applications: JobApplicationDTO[] = createSeedApplications(companies);
let interviews: InterviewDTO[] = createSeedInterviews();
let activity: ApplicationActivityDTO[] = createSeedActivity();
let stats: DashboardStatsDTO = computeStats(applications);

// Reset all mock data back to initial seed state
// Demo user's time zone; starts as the browser's and can be changed in Settings
let demoTimeZone: string | null = browserTimeZone();

function demoUser() {
  return { token: null, name: 'Demo User', email: 'demo@jobflow.com', avatarUrl: null, jobTitle: null, bio: null,
    hasPassword: true, gmailConnected: false, timeZone: demoTimeZone };
}

export function resetMockData(): void {
  demoTimeZone = browserTimeZone();
  companies = createSeedCompanies();
  applications = createSeedApplications(companies);
  interviews = createSeedInterviews();
  activity = createSeedActivity();
  stats = computeStats(applications);
}

// Helper: remove interviews linked to a set of application ids
function cascadeDeleteInterviewsByAppIds(appIds: Set<number>): void {
  interviews = interviews.filter(i => !appIds.has(i.jobApplicationId));
}

// Mirrors the backend's partial update: missing = keep, blank = clear (null)
function keepOrClear(value: unknown, current: string | null): string | null {
  if (value === undefined || value === null) return current;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

// Mirrors the backend: a real status change becomes "Moved to Phone Screen", otherwise keep what's there
// formatLastAction.ts parses this wording for translation, keep them in sync
function lastActionAfter(app: JobApplicationDTO, newStatus: ApplicationStatus): string | null {
  if (app.status === newStatus) return app.lastAction;
  const label = newStatus
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
  return `Moved to ${label}`;
}

// Resolve mock API calls by URL pattern
export function resolveMock(url: string, method: string, body?: unknown, params?: Record<string, unknown>): unknown | undefined {
  if (method === 'get') {
    if (url === '/applications/stats') return { ...stats };
    // Same as the backend: 10 most recently updated
    if (url === '/applications/recent') {
      return [...applications]
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, 10);
    }
    if (url === '/applications/activity') return [...activity];
    if (url === '/applications') {
      const statusFilter = params?.status as string | undefined;
      if (statusFilter) return applications.filter(a => a.status === statusFilter);
      return [...applications];
    }
    if (url === '/applications/page') {
      const page = Number(params?.page ?? 0);
      const size = Number(params?.size ?? 20);
      const status = params?.status as string | undefined;
      const keyword = (params?.keyword as string)?.toLowerCase();
      let filtered = applications;
      if (status) filtered = filtered.filter(a => a.status === status);
      if (keyword) filtered = filtered.filter(a =>
        a.positionTitle.toLowerCase().includes(keyword) || a.company.name.toLowerCase().includes(keyword)
      );
      const start = page * size;
      return {
        content: filtered.slice(start, start + size),
        totalElements: filtered.length,
        totalPages: Math.ceil(filtered.length / size),
        number: page,
        size,
      };
    }
    if (url === '/applications/export') {
      const csv = ['Position,Company,Location,Status,Applied Date,Salary']
        .concat(applications.map(a =>
          `"${a.positionTitle}","${a.company.name}","${a.location || ''}","${a.status}","${a.appliedDate || ''}","${a.salary || ''}"`
        )).join('\n');
      return new Blob([csv], { type: 'text/csv' });
    }
    if (url.match(/^\/applications\/\d+$/)) {
      const id = Number(url.split('/').pop());
      return applications.find(a => a.id === id);
    }
    if (url === '/companies') return [...companies];
    if (url.match(/^\/companies\/\d+$/)) {
      const id = Number(url.split('/').pop());
      return companies.find(c => c.id === id);
    }
    if (url === '/interviews') return [...interviews];
    // Like the backend: only interviews still ahead, soonest first
    if (url === '/interviews/upcoming') {
      const now = new Date();
      return interviews
        .filter(i => new Date(i.interviewDate) > now)
        .sort((a, b) => new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime())
        .map(i => ({ ...i, daysUntil: daysUntilLocal(i.interviewDate, now) }));
    }
    if (url === '/auth/me') return demoUser();
    if (url === '/gmail/status') return { gmailConnected: false, provider: '' };
    if (url === '/gmail/link') return { authUrl: '' };
  }

  // ===== Application CRUD =====
  if (method === 'post' && url === '/applications') {
    const payload = (typeof body === 'string' ? JSON.parse(body) : body) as Record<string, unknown> | undefined;
    const companyId = payload?.companyId as number | undefined;
    const companyName = (payload?.companyName as string) || 'New Company';
    const matchedCompany = companyId ? companies.find(c => c.id === companyId) : undefined;
    const company: CompanyDTO = matchedCompany ?? { id: Date.now(), name: companyName, logoUrl: null, location: null, website: null };
    if (!matchedCompany) companies.push(company);

    const now = new Date().toISOString();
    const newApp: JobApplicationDTO = {
      id: Date.now(),
      positionTitle: (payload?.positionTitle as string) || 'Untitled',
      company,
      location: (payload?.location as string) || null,
      salary: (payload?.salary as string) || null,
      status: (payload?.status as ApplicationStatus) || 'APPLIED',
      appliedDate: (payload?.appliedDate as string) || todayLocal(),
      lastAction: 'Applied',
      notes: (payload?.notes as string) || null,
      createdAt: now,
      updatedAt: now,
      starred: false,
    };
    applications.unshift(newApp);
    stats = computeStats(applications);
    return newApp;
  }
  if (method === 'put' && url.match(/^\/applications\/\d+$/)) {
    const id = Number(url.split('/').pop());
    const idx = applications.findIndex(a => a.id === id);
    if (idx === -1) return applications[0];
    const payload = (typeof body === 'string' ? JSON.parse(body) : body) as Record<string, unknown> | undefined;
    const companyId = payload?.companyId as number | undefined;
    const companyName = (payload?.companyName as string) || applications[idx].company.name;
    const matchedCompany = companyId ? companies.find(c => c.id === companyId) : undefined;
    const company: CompanyDTO = matchedCompany ?? { ...applications[idx].company, name: companyName };
    const newStatus = (payload?.status as ApplicationStatus) || applications[idx].status;
    const lastAction = (payload?.lastAction as string) ?? lastActionAfter(applications[idx], newStatus);

    applications[idx] = {
      ...applications[idx],
      positionTitle: (payload?.positionTitle as string) || applications[idx].positionTitle,
      company,
      location: keepOrClear(payload?.location, applications[idx].location),
      salary: keepOrClear(payload?.salary, applications[idx].salary),
      status: newStatus,
      lastAction,
      appliedDate: (payload?.appliedDate as string) || applications[idx].appliedDate,
      notes: keepOrClear(payload?.notes, applications[idx].notes),
      updatedAt: new Date().toISOString(),
    };
    stats = computeStats(applications);
    return applications[idx];
  }

  // ===== Application PATCH (status / star) =====
  if (method === 'patch' && url.match(/^\/applications\/\d+\/status$/)) {
    const id = Number(url.split('/')[2]);
    const idx = applications.findIndex(a => a.id === id);
    if (idx === -1) return applications[0];
    const newStatus = (params?.status as ApplicationStatus) || applications[idx].status;
    applications[idx] = {
      ...applications[idx],
      status: newStatus,
      lastAction: lastActionAfter(applications[idx], newStatus),
      updatedAt: new Date().toISOString(),
    };
    stats = computeStats(applications);
    return applications[idx];
  }
  if (method === 'patch' && url.match(/^\/applications\/\d+\/star$/)) {
    const id = Number(url.split('/')[2]);
    const idx = applications.findIndex(a => a.id === id);
    if (idx === -1) return applications[0];
    applications[idx] = { ...applications[idx], starred: !applications[idx].starred, updatedAt: new Date().toISOString() };
    return applications[idx];
  }

  // ===== Interview CRUD =====
  if (method === 'post' && url === '/interviews') {
    const payload = (typeof body === 'string' ? JSON.parse(body) : body) as Record<string, unknown> | undefined;
    const appId = payload?.jobApplicationId as number | undefined;
    const linkedApp = appId ? applications.find(a => a.id === appId) : undefined;
    const interviewDate = (payload?.interviewDate as string) || new Date().toISOString();
    const daysUntil = daysUntilLocal(interviewDate);

    const newInterview: InterviewDTO = {
      id: Date.now(),
      jobApplicationId: appId || 1,
      positionTitle: linkedApp?.positionTitle || (payload?.positionTitle as string) || 'New Interview',
      companyName: linkedApp?.company.name || (payload?.companyName as string) || 'Company',
      interviewDate,
      interviewType: (payload?.interviewType as InterviewType | undefined) || 'VIDEO',
      notes: (payload?.notes as string) || null,
      reminderEnabled: (payload?.reminderEnabled as boolean) ?? false,
      reminderHoursBefore: (payload?.reminderHoursBefore as number) ?? 24,
      reminderSent: false,
      daysUntil,
    };
    interviews.unshift(newInterview);
    return newInterview;
  }
  if (method === 'put' && url.match(/^\/interviews\/\d+$/)) {
    const id = Number(url.split('/').pop());
    const idx = interviews.findIndex(i => i.id === id);
    if (idx === -1) return interviews[0];
    const payload = (typeof body === 'string' ? JSON.parse(body) : body) as Record<string, unknown> | undefined;
    const interviewDate = (payload?.interviewDate as string) || interviews[idx].interviewDate;
    const daysUntil = daysUntilLocal(interviewDate);

    interviews[idx] = {
      ...interviews[idx],
      interviewDate,
      interviewType: (payload?.interviewType as InterviewType | undefined) || interviews[idx].interviewType,
      notes: keepOrClear(payload?.notes, interviews[idx].notes),
      reminderEnabled: (payload?.reminderEnabled as boolean) ?? interviews[idx].reminderEnabled,
      reminderHoursBefore: (payload?.reminderHoursBefore as number) ?? interviews[idx].reminderHoursBefore,
      daysUntil,
    };
    return interviews[idx];
  }

  // ===== Company CRUD =====
  if (method === 'post' && url === '/companies') {
    const payload = (typeof body === 'string' ? JSON.parse(body) : body) as Record<string, unknown> | undefined;
    const newCompany: CompanyDTO = {
      id: Date.now(),
      name: (payload?.name as string) || 'New Company',
      logoUrl: (payload?.logoUrl as string) || null,
      location: (payload?.location as string) || null,
      website: (payload?.website as string) || null,
    };
    companies.push(newCompany);
    return newCompany;
  }
  if (method === 'put' && url.match(/^\/companies\/\d+$/)) {
    const id = Number(url.split('/').pop());
    const idx = companies.findIndex(c => c.id === id);
    if (idx === -1) return companies[0];
    const payload = (typeof body === 'string' ? JSON.parse(body) : body) as Record<string, unknown> | undefined;
    companies[idx] = {
      ...companies[idx],
      name: (payload?.name as string) || companies[idx].name,
      logoUrl: (payload?.logoUrl as string) ?? companies[idx].logoUrl,
      location: (payload?.location as string) ?? companies[idx].location,
      website: (payload?.website as string) ?? companies[idx].website,
    };
    return companies[idx];
  }

  // ===== Profile & Password =====
  if (method === 'put' && url === '/auth/profile') {
    return demoUser();
  }
  if (method === 'put' && url === '/auth/time-zone') {
    const payload = (typeof body === 'string' ? JSON.parse(body) : body) as { timeZone?: string } | undefined;
    if (payload?.timeZone) demoTimeZone = payload.timeZone;
    return demoUser();
  }
  if (method === 'put' && url === '/auth/password') {
    return {};
  }

  // ===== Generic delete & batch delete =====
  if (method === 'delete' && url === '/applications/batch') {
    const ids = (typeof body === 'string' ? JSON.parse(body) : body) as number[] | undefined;
    if (ids) {
      const idSet = new Set(ids);
      cascadeDeleteInterviewsByAppIds(idSet);
      applications = applications.filter(a => !idSet.has(a.id));
      stats = computeStats(applications);
    }
    return {};
  }
  if (method === 'delete') {
    if (url.match(/^\/interviews\/\d+$/)) {
      const id = Number(url.split('/').pop());
      interviews = interviews.filter(i => i.id !== id);
    }
    if (url.match(/^\/companies\/\d+$/)) {
      const id = Number(url.split('/').pop());
      // Cascade: find applications belonging to this company, then their interviews
      const affectedAppIds = new Set(applications.filter(a => a.company.id === id).map(a => a.id));
      cascadeDeleteInterviewsByAppIds(affectedAppIds);
      applications = applications.filter(a => a.company.id !== id);
      companies = companies.filter(c => c.id !== id);
      stats = computeStats(applications);
    }
    if (url.match(/^\/applications\/\d+$/)) {
      const id = Number(url.split('/').pop());
      // Cascade: remove interviews linked to this application
      cascadeDeleteInterviewsByAppIds(new Set([id]));
      applications = applications.filter(a => a.id !== id);
      stats = computeStats(applications);
    }
    return {};
  }

  return undefined;
}

export function isDemoMode(): boolean {
  return localStorage.getItem('jobflow-token') === 'demo-token';
}
