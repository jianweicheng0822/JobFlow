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
// Seed jobs are placed "N days before this week's Friday", so the demo always
// looks like a search that's still going on, and each job keeps its weekday no
// matter which day the demo is opened. That keeps the heatmap's weekday spread
// realistic (busy Mondays, quiet weekends) every day of the week.

// The seed day for `daysBack`, as a local date. Weekends move to the nearest
// weekday, and a day that hasn't happened yet this week moves back a week.
function seedDay(daysBack: number, now: Date = new Date()): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const friday = new Date(today);
  friday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + 4);
  const d = new Date(friday);
  d.setDate(friday.getDate() - daysBack);
  if (d.getDay() === 6) d.setDate(d.getDate() - 1);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  while (d > today) d.setDate(d.getDate() - 7);
  return d;
}

// "2026-10-08T14:05:00Z" for that local day and time, like the backend's timestamps
// A seed day can be today, and today's 4 PM is still ahead early in the morning,
// so anything later than a few minutes ago is pulled back to then. Otherwise a
// job the user just edited wouldn't come out on top of "recently updated".
function timestampOn(day: Date, hour: number, minute: number): string {
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
  const latest = new Date(Date.now() - 5 * 60_000);
  return (d > latest ? latest : d).toISOString().replace(/\.\d{3}Z$/, 'Z');
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
    { id: 8, name: 'Stripe', logoUrl: null, location: 'San Francisco, CA', website: 'https://stripe.com' },
    { id: 9, name: 'Airbnb', logoUrl: null, location: 'San Francisco, CA', website: 'https://airbnb.com' },
    { id: 10, name: 'Shopify', logoUrl: null, location: 'Remote', website: 'https://shopify.com' },
    { id: 11, name: 'Datadog', logoUrl: null, location: 'New York, NY', website: 'https://datadoghq.com' },
    { id: 12, name: 'Figma', logoUrl: null, location: 'San Francisco, CA', website: 'https://figma.com' },
    { id: 13, name: 'Uber', logoUrl: null, location: 'San Francisco, CA', website: 'https://uber.com' },
    { id: 14, name: 'LinkedIn', logoUrl: null, location: 'Sunnyvale, CA', website: 'https://linkedin.com' },
    { id: 15, name: 'Salesforce', logoUrl: null, location: 'San Francisco, CA', website: 'https://salesforce.com' },
  ];
}

// One row per seed job: [id, title, company, salary, applied, status, heard back,
// last action, starred, notes]. Days are counted back as in seedDay. Status and
// timing follow a real search: a slow start about 5 months ago, a busy middle,
// and a quieter last few weeks with interviews and an offer. Most old
// applications never got an answer, which is normal.
type SeedRow = [
  number, string, string, string, number, ApplicationStatus,
  number?, string?, boolean?, string?,
];

const SEED_ROWS: SeedRow[] = [
  // Last few weeks
  [9, 'DevOps Engineer', 'Amazon', '$135,000', 3, 'APPLIED'],
  [2, 'Frontend Engineer', 'Spotify', '$120,000', 9, 'APPLIED'],
  [8, 'Data Analyst', 'Google', '$125,000', 14, 'IN_REVIEW', 6, 'Resume reviewed', true],
  [13, 'iOS Engineer', 'Apple', '$165,000', 17, 'IN_REVIEW', 8, 'Recruiter reached out'],
  [18, 'Software Engineer II', 'Datadog', '$145,000', 22, 'APPLIED'],
  [16, 'Frontend Engineer', 'Airbnb', '$160,000', 24, 'IN_REVIEW', 10, 'Recruiter reached out'],
  [4, 'Software Engineer', 'Amazon', '$155,000', 28, 'PHONE_SCREEN', 2, 'Phone screen scheduled'],
  [3, 'Product Manager', 'Meta', '$160,000', 32, 'INTERVIEW', 3, 'Video interview scheduled'],
  [17, 'Senior Frontend Developer', 'Shopify', '$140,000', 35, 'IN_REVIEW', 15, 'Resume reviewed'],
  [14, 'Data Engineer', 'Netflix', '$150,000', 38, 'APPLIED'],
  [11, 'Mobile Engineer', 'Spotify', '$118,000', 39, 'APPLIED'],
  [15, 'Software Engineer, Payments', 'Stripe', '$175,000', 44, 'PHONE_SCREEN', 12, 'Phone screen done', true],
  [19, 'Product Designer', 'Figma', '$150,000', 46, 'APPLIED'],
  // The busy middle
  [24, 'Full Stack Engineer', 'Stripe', '$165,000', 51, 'APPLIED'],
  [25, 'Senior Software Engineer', 'Airbnb', '$180,000', 51, 'APPLIED'],
  [21, 'Frontend Engineer', 'LinkedIn', '$150,000', 53, 'REJECTED', 35, 'Rejected'],
  [6, 'Full Stack Developer', 'Netflix', '$165,000', 56, 'OFFER', 1, 'Offer received', true, 'Negotiating salary'],
  [5, 'Senior Frontend Engineer', 'Apple', '$170,000', 58, 'INTERVIEW', 4, 'Onsite scheduled', true, 'Onsite round 2'],
  [20, 'Backend Engineer', 'Uber', '$155,000', 60, 'PHONE_SCREEN', 30, 'Waiting to hear back'],
  [26, 'Frontend Developer', 'Shopify', '$130,000', 63, 'APPLIED'],
  [27, 'Site Reliability Engineer', 'Datadog', '$150,000', 59, 'APPLIED'],
  [1, 'Senior UX Designer', 'Google', '$145,000', 64, 'APPLIED'],
  [23, 'Machine Learning Engineer', 'Google', '$170,000', 67, 'REJECTED', 52, 'Rejected'],
  [12, 'Platform Engineer', 'Microsoft', '$148,000', 72, 'REJECTED', 50, 'Rejected'],
  [28, 'Software Engineer, Front End', 'Uber', '$150,000', 74, 'APPLIED'],
  [22, 'Software Engineer', 'Salesforce', '$140,000', 80, 'REJECTED', 60, 'Rejected after phone screen'],
  [29, 'Web Developer', 'LinkedIn', '$135,000', 86, 'APPLIED'],
  // Getting going
  [31, 'Frontend Engineer', 'Microsoft', '$135,000', 92, 'APPLIED'],
  [32, 'UI Engineer', 'Netflix', '$155,000', 92, 'APPLIED'],
  [7, 'Backend Engineer', 'Microsoft', '$150,000', 95, 'REJECTED', 70, 'Rejected after final round'],
  [33, 'Software Engineer, Tableau', 'Salesforce', '$130,000', 102, 'APPLIED'],
  [30, 'Data Scientist', 'Amazon', '$145,000', 109, 'REJECTED', 95, 'Rejected'],
  [34, 'Product Engineer', 'Figma', '$155,000', 113, 'APPLIED'],
  [35, 'Frontend Engineer, Growth', 'Spotify', '$115,000', 119, 'APPLIED'],
  [36, 'React Developer', 'Shopify', '$125,000', 122, 'APPLIED'],
  [38, 'Frontend Engineer', 'Datadog', '$140,000', 128, 'APPLIED'],
  [39, 'Software Engineer', 'Google', '$155,000', 134, 'APPLIED'],
  [37, 'Software Engineer', 'Apple', '$150,000', 134, 'REJECTED', 120, 'Rejected'],
  [10, 'UX Researcher', 'Meta', '$130,000', 141, 'REJECTED', 128, 'Rejected'],
  [40, 'UX Engineer', 'Airbnb', '$145,000', 150, 'APPLIED'],
];

function createSeedApplications(companies: CompanyDTO[]): JobApplicationDTO[] {
  return SEED_ROWS
    .map(([id, positionTitle, companyName, salary, appliedBack, status, heardBack, lastAction, starred, notes]) => {
      const company = companies.find((c) => c.name === companyName) ?? companies[0];
      const appliedDay = seedDay(appliedBack);
      // Spread the times over the working day so lists don't all say 9:00
      const createdAt = timestampOn(appliedDay, 8 + ((id * 5) % 10), (id * 13) % 60);
      const heardDay = heardBack === undefined ? null : seedDay(heardBack);
      const updatedAt = heardDay && heardDay > appliedDay
        ? timestampOn(heardDay, 9 + ((id * 3) % 8), (id * 7) % 60)
        : createdAt;
      return {
        id, positionTitle, company, location: company.location, salary, status,
        appliedDate: todayLocal(appliedDay),
        lastAction: lastAction ?? 'Applied',
        notes: notes ?? null,
        createdAt, updatedAt,
        starred: starred ?? false,
      };
    })
    .sort((a, b) => a.id - b.id);
}

// Local wall-clock date-time on a seed day, in the backend's format
function localDateTimeOnSeedDay(daysBack: number, hour: number, minute = 0): string {
  return `${todayLocal(seedDay(daysBack))}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

// Interviews that already happened, matching where each job stands: the Netflix
// offer went through three rounds, the Microsoft rejection came after an onsite,
// and so on. [id, application, type, days back, hour, notes]
type PastInterviewRow = [number, number, InterviewType, number, number, string];

const PAST_INTERVIEW_ROWS: PastInterviewRow[] = [
  [4, 6, 'PHONE', 45, 11, 'Recruiter call, team and comp overview'],
  [5, 6, 'VIDEO', 30, 13, 'Live coding: React + system design'],
  [6, 6, 'ONSITE', 14, 10, 'Final round, 4 interviews'],
  [7, 5, 'PHONE', 44, 15, 'Hiring manager screen'],
  [8, 5, 'VIDEO', 23, 11, 'Onsite round 1 (virtual): coding + behavioral'],
  [9, 3, 'PHONE', 18, 16, 'Recruiter screen'],
  [10, 15, 'PHONE', 12, 14, 'Technical phone screen, went well'],
  [11, 20, 'PHONE', 31, 10, 'Recruiter screen, said they would follow up'],
  [12, 7, 'PHONE', 85, 15, 'Technical phone screen'],
  [13, 7, 'ONSITE', 74, 9, 'Final round in Redmond'],
  [14, 22, 'PHONE', 63, 13, 'Phone screen, LeetCode medium'],
];

function createPastInterviews(apps: JobApplicationDTO[]): InterviewDTO[] {
  return PAST_INTERVIEW_ROWS.map(([id, appId, interviewType, daysBack, hour, notes]) => {
    const app = apps.find((a) => a.id === appId)!;
    const interviewDate = localDateTimeOnSeedDay(daysBack, hour);
    return {
      id, jobApplicationId: appId, positionTitle: app.positionTitle, companyName: app.company.name,
      interviewDate, interviewType, notes,
      reminderEnabled: false, reminderHoursBefore: 24, reminderSent: false,
      daysUntil: daysUntilLocal(interviewDate),
    };
  });
}

function createSeedInterviews(apps: JobApplicationDTO[]): InterviewDTO[] {
  return [
    ...createPastInterviews(apps),
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

// Same buckets as JobApplicationService.getActivity: the last 12 months by applied date, oldest first
export function computeActivity(apps: JobApplicationDTO[], today: string = todayLocal()): ApplicationActivityDTO[] {
  const [year, month] = today.split('-').map(Number);
  const activity: ApplicationActivityDTO[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(year, month - 1 - i, 1);
    const yearMonth = todayLocal(start).slice(0, 7);
    const count = apps.filter(a => a.appliedDate?.startsWith(yearMonth)).length;
    activity.push({ yearMonth, count });
  }
  return activity;
}

// Same numbers as JobApplicationService.getStats: anything past APPLIED is a response,
// offers count toward the interview rate, and rates are percentages with one decimal
function computeStats(apps: JobApplicationDTO[]): DashboardStatsDTO {
  const total = apps.length;
  const interviews = apps.filter(a => a.status === 'INTERVIEW').length;
  const offers = apps.filter(a => a.status === 'OFFER').length;
  const responded = apps.filter(a => a.status !== 'APPLIED').length;
  const rate = (count: number) => (total > 0 ? Math.round((count * 1000) / total) / 10 : 0);
  return {
    totalApplications: total,
    inReview: apps.filter(a => a.status === 'IN_REVIEW').length,
    interviews,
    offers,
    rejections: apps.filter(a => a.status === 'REJECTED').length,
    responded,
    responseRate: rate(responded),
    interviewRate: rate(interviews + offers),
    offerRate: rate(offers),
  };
}

// Mutable working copies that CRUD operations modify
let companies: CompanyDTO[] = createSeedCompanies();
let applications: JobApplicationDTO[] = createSeedApplications(companies);
let interviews: InterviewDTO[] = createSeedInterviews(applications);
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
  interviews = createSeedInterviews(applications);
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
    if (url === '/applications/activity') return computeActivity(applications);
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
    // Demo shows every feature; the backend decides for real accounts
    if (url === '/auth/providers') return { google: true, github: true, gmail: true, emailReminders: true };
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
  // Demo data is only in memory; the sign-out that follows resets it anyway
  if (method === 'delete' && url === '/auth/me') {
    resetMockData();
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
