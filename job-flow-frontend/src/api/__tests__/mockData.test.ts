import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { resolveMock as ResolveMockFn, isDemoMode as IsDemoModeFn } from '../mockData';
import type {
  JobApplicationDTO,
  InterviewDTO,
  CompanyDTO,
  DashboardStatsDTO,
  ApplicationActivityDTO,
} from '../types';
import { todayLocal } from '../../utils/date';

// Use dynamic imports so each test gets a fresh copy of the mutable arrays
let resolveMock: typeof ResolveMockFn;
let isDemoMode: typeof IsDemoModeFn;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../mockData');
  resolveMock = mod.resolveMock;
  isDemoMode = mod.isDemoMode;
});

describe('resolveMock GET endpoints', () => {
  it('GET /applications returns array of applications', () => {
    const result = resolveMock('/applications', 'get') as JobApplicationDTO[];
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('positionTitle');
    expect(result[0]).toHaveProperty('company');
  });

  it('GET /applications/stats returns stats object', () => {
    const result = resolveMock('/applications/stats', 'get') as DashboardStatsDTO;
    expect(result).toHaveProperty('totalApplications');
    expect(result).toHaveProperty('inReview');
    expect(result).toHaveProperty('interviews');
    expect(result).toHaveProperty('offers');
    expect(result).toHaveProperty('rejections');
  });

  it('GET /interviews returns array of interviews', () => {
    const result = resolveMock('/interviews', 'get') as InterviewDTO[];
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('interviewType');
    expect(result[0]).toHaveProperty('companyName');
  });

  it('GET /companies returns array of companies', () => {
    const result = resolveMock('/companies', 'get') as CompanyDTO[];
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('name');
  });

  it('GET /companies/:id returns single company', () => {
    const allCompanies = resolveMock('/companies', 'get') as CompanyDTO[];
    const first = allCompanies[0];
    const result = resolveMock(`/companies/${first.id}`, 'get') as CompanyDTO;
    expect(result.id).toBe(first.id);
    expect(result.name).toBe(first.name);
  });

  it('GET /auth/me returns user info', () => {
    const result = resolveMock('/auth/me', 'get') as Record<string, unknown>;
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('email');
    expect(result).toHaveProperty('hasPassword', true);
  });
});

describe('resolveMock POST endpoints', () => {
  it('POST /interviews creates and returns new interview', () => {
    const before = (resolveMock('/interviews', 'get') as InterviewDTO[]).length;
    const created = resolveMock('/interviews', 'post') as InterviewDTO;

    expect(created).toHaveProperty('id');
    expect(created).toHaveProperty('interviewType');

    const after = (resolveMock('/interviews', 'get') as InterviewDTO[]).length;
    expect(after).toBe(before + 1);
  });

  it('POST /companies creates and returns new company', () => {
    const before = (resolveMock('/companies', 'get') as CompanyDTO[]).length;
    const created = resolveMock('/companies', 'post') as CompanyDTO;

    expect(created).toHaveProperty('id');
    expect(created).toHaveProperty('name');

    const after = (resolveMock('/companies', 'get') as CompanyDTO[]).length;
    expect(after).toBe(before + 1);
  });
});

describe('resolveMock DELETE endpoints', () => {
  it('DELETE /interviews/:id removes from array', () => {
    const interviews = resolveMock('/interviews', 'get') as InterviewDTO[];
    const targetId = interviews[0].id;
    const before = interviews.length;

    resolveMock(`/interviews/${targetId}`, 'delete');

    const after = (resolveMock('/interviews', 'get') as InterviewDTO[]).length;
    expect(after).toBe(before - 1);
  });

  it('DELETE /companies/:id removes from array', () => {
    const companies = resolveMock('/companies', 'get') as CompanyDTO[];
    const targetId = companies[0].id;
    const before = companies.length;

    resolveMock(`/companies/${targetId}`, 'delete');

    const after = (resolveMock('/companies', 'get') as CompanyDTO[]).length;
    expect(after).toBe(before - 1);
  });

  it('DELETE /applications/:id removes and updates stats', () => {
    const apps = resolveMock('/applications', 'get') as JobApplicationDTO[];
    const targetId = apps[0].id;
    const statsBefore = resolveMock('/applications/stats', 'get') as DashboardStatsDTO;
    const totalBefore = statsBefore.totalApplications;

    resolveMock(`/applications/${targetId}`, 'delete');

    const statsAfter = resolveMock('/applications/stats', 'get') as DashboardStatsDTO;
    expect(statsAfter.totalApplications).toBe(totalBefore - 1);
  });
});

describe('status changes update lastAction', () => {
  // Seed app 1 is APPLIED with lastAction "Applied"
  it('PATCH /status sets a readable lastAction when the status changes', () => {
    const result = resolveMock('/applications/1/status', 'patch', undefined, { status: 'PHONE_SCREEN' }) as JobApplicationDTO;
    expect(result.status).toBe('PHONE_SCREEN');
    expect(result.lastAction).toBe('Moved to Phone Screen');
  });

  it('PATCH /status keeps lastAction when the status is the same', () => {
    const result = resolveMock('/applications/1/status', 'patch', undefined, { status: 'APPLIED' }) as JobApplicationDTO;
    expect(result.lastAction).toBe('Applied');
  });

  it('PUT updates lastAction when the form changes the status', () => {
    const result = resolveMock('/applications/1', 'put', { status: 'OFFER' }) as JobApplicationDTO;
    expect(result.lastAction).toBe('Moved to Offer');
  });

  it('PUT keeps an explicit lastAction over the auto one', () => {
    const result = resolveMock('/applications/1', 'put', { status: 'OFFER', lastAction: 'Signed!' }) as JobApplicationDTO;
    expect(result.lastAction).toBe('Signed!');
  });
});

describe('PUT partial update', () => {
  // Seed app 1 has location 'Seattle, WA' and salary '$145,000'
  it('clears an optional field sent as a blank string', () => {
    const result = resolveMock('/applications/1', 'put', { location: '  ' }) as JobApplicationDTO;
    expect(result.location).toBeNull();
    expect(result.salary).toBe('$145,000');
  });

  it('keeps fields that are not sent', () => {
    const result = resolveMock('/applications/1', 'put', { notes: 'hello' }) as JobApplicationDTO;
    expect(result.location).toBe('Seattle, WA');
    expect(result.notes).toBe('hello');
  });
});

describe('GET /applications/recent', () => {
  it('returns up to 10, most recently updated first', () => {
    const recent = resolveMock('/applications/recent', 'get') as JobApplicationDTO[];
    expect(recent.length).toBeLessThanOrEqual(10);
    const times = recent.map((a) => Date.parse(a.updatedAt));
    expect(times).toEqual([...times].sort((x, y) => y - x));
  });

  it('puts an application on top right after its status changes', () => {
    // Seed app 10 is one of the oldest updates
    resolveMock('/applications/10/status', 'patch', undefined, { status: 'OFFER' });
    const recent = resolveMock('/applications/recent', 'get') as JobApplicationDTO[];
    expect(recent[0].id).toBe(10);
  });

  it('puts an application on top right after it is starred', () => {
    resolveMock('/applications/7/star', 'patch');
    const recent = resolveMock('/applications/recent', 'get') as JobApplicationDTO[];
    expect(recent[0].id).toBe(7);
  });
});

describe('demo user time zone', () => {
  it('starts with the browser zone and can be changed like the real API', () => {
    const before = resolveMock('/auth/me', 'get') as { timeZone: string | null };
    expect(before.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);

    const after = resolveMock('/auth/time-zone', 'put', { timeZone: 'Asia/Shanghai' }) as { timeZone: string };
    expect(after.timeZone).toBe('Asia/Shanghai');
    expect((resolveMock('/auth/me', 'get') as { timeZone: string }).timeZone).toBe('Asia/Shanghai');
  });
});

describe('demo data stays current', () => {
  const localToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  it('spreads applications over the last five months, relative to today', () => {
    const apps = resolveMock('/applications', 'get') as JobApplicationDTO[];
    const byId = Object.fromEntries(apps.map((a) => [a.id, a]));

    expect(apps).toHaveLength(40);
    expect(apps.every((a) => (a.appliedDate ?? '') <= localToday())).toBe(true);
    // Seed 9 is the newest, within the last week and a half whatever today is
    expect(byId[9].appliedDate! >= daysAgo(10)).toBe(true);
    // Seed 40 is the oldest, about five months back
    expect(byId[40].appliedDate! <= daysAgo(140)).toBe(true);
    expect(byId[40].appliedDate! >= daysAgo(160)).toBe(true);
  });

  it('never dates an application or a reply on a weekend', () => {
    const apps = resolveMock('/applications', 'get') as JobApplicationDTO[];
    const weekday = (day: string) => {
      const [y, m, d] = day.split('-').map(Number);
      return new Date(y, m - 1, d).getDay();
    };

    expect(apps.every((a) => ![0, 6].includes(weekday(a.appliedDate!)))).toBe(true);
    expect(apps.every((a) => ![0, 6].includes(new Date(a.updatedAt).getDay()))).toBe(true);
    // A reply never comes before the application
    expect(apps.every((a) => a.updatedAt >= a.createdAt)).toBe(true);
  });

  it('counts only INTERVIEW as interviews and computes the rates like the backend', () => {
    const stats = resolveMock('/applications/stats', 'get') as DashboardStatsDTO;
    // Seed: 40 apps, 22 never heard back, two INTERVIEW, three PHONE_SCREEN and one OFFER
    expect(stats.totalApplications).toBe(40);
    expect(stats.interviews).toBe(2);
    expect(stats.responded).toBe(18);
    expect(stats.responseRate).toBe(45);
    // Interview + offer; phone screens don't count
    expect(stats.interviewRate).toBe(7.5);
    expect(stats.offerRate).toBe(2.5);
  });

  it('builds the monthly activity from the seed applications', () => {
    const activity = resolveMock('/applications/activity', 'get') as ApplicationActivityDTO[];

    expect(activity).toHaveLength(12);
    expect(activity[11].yearMonth).toBe(todayLocal().slice(0, 7));
    // Every seed app was applied within the last 12 months, across at least five of them
    expect(activity.reduce((sum, m) => sum + m.count, 0)).toBe(40);
    expect(activity.filter((m) => m.count > 0).length).toBeGreaterThanOrEqual(5);
  });

  it('crosses the new year when bucketing months', async () => {
    const { computeActivity } = await import('../mockData');
    const apps = [{ appliedDate: '2025-02-03' }, { appliedDate: '2026-01-10' }, { appliedDate: null }] as JobApplicationDTO[];

    const activity = computeActivity(apps, '2026-01-15');

    expect(activity.map((m) => m.yearMonth)).toEqual([
      '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07',
      '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01',
    ]);
    expect(activity[0].count).toBe(1);
    expect(activity[11].count).toBe(1);
  });

  it('puts the seed interviews in the near future, soonest first', () => {
    const upcoming = resolveMock('/interviews/upcoming', 'get') as InterviewDTO[];

    expect(upcoming.map((i) => i.daysUntil)).toEqual([1, 2, 5]);
    expect(upcoming.every((i) => new Date(i.interviewDate) > new Date())).toBe(true);
    // Stored like the backend: local wall-clock time, no zone suffix
    expect(upcoming.every((i) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(i.interviewDate))).toBe(true);
  });

  it('leaves past interviews out of upcoming', () => {
    const past = `${daysAgo(1)}T10:00:00`;
    const created = resolveMock('/interviews', 'post', { jobApplicationId: 1, interviewDate: past, interviewType: 'PHONE' }) as InterviewDTO;

    const upcoming = resolveMock('/interviews/upcoming', 'get') as InterviewDTO[];
    expect(upcoming.some((i) => i.id === created.id)).toBe(false);
    expect(created.daysUntil).toBe(-1);
  });
});

describe('daysUntilLocal', () => {
  it('counts calendar days, not 24-hour blocks', async () => {
    const { daysUntilLocal } = await import('../mockData');
    const now = new Date(2026, 9, 6, 23, 30); // 11:30pm Oct 6
    expect(daysUntilLocal('2026-10-06T23:45:00', now)).toBe(0);
    expect(daysUntilLocal('2026-10-07T00:15:00', now)).toBe(1); // 45 minutes away but tomorrow
    expect(daysUntilLocal('2026-10-13T09:00:00', now)).toBe(7);
  });
});

describe('isDemoMode', () => {
  it('returns true when token is demo-token', () => {
    localStorage.setItem('jobflow-token', 'demo-token');
    expect(isDemoMode()).toBe(true);
    localStorage.removeItem('jobflow-token');
  });

  it('returns false when token is not demo-token', () => {
    localStorage.setItem('jobflow-token', 'real-jwt-token');
    expect(isDemoMode()).toBe(false);
    localStorage.removeItem('jobflow-token');
  });

  it('returns false when no token exists', () => {
    localStorage.removeItem('jobflow-token');
    expect(isDemoMode()).toBe(false);
  });
});

describe('demo interview history', () => {
  it('has past interviews that line up with each job', () => {
    const apps = resolveMock('/applications', 'get') as JobApplicationDTO[];
    const interviews = resolveMock('/interviews', 'get') as InterviewDTO[];
    const past = interviews.filter((i) => new Date(i.interviewDate) <= new Date());

    expect(past.length).toBeGreaterThanOrEqual(8);
    for (const iv of past) {
      const app = apps.find((a) => a.id === iv.jobApplicationId)!;
      expect(app.positionTitle).toBe(iv.positionTitle);
      expect(app.company.name).toBe(iv.companyName);
      // Never interviewed before applying, and never for a job still at "Applied"
      expect(iv.interviewDate.slice(0, 10) >= app.appliedDate!).toBe(true);
      expect(app.status).not.toBe('APPLIED');
    }
    // The offer came after more than one round
    const offer = apps.find((a) => a.status === 'OFFER')!;
    expect(past.filter((i) => i.jobApplicationId === offer.id).length).toBeGreaterThan(1);
  });
});

describe('seed timestamps', () => {
  afterEach(() => vi.useRealTimers());

  it('are never in the future, even early on a Monday morning', async () => {
    // Monday 1:24 AM: seed days that land on today would otherwise get afternoon times
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 26, 1, 24));
    vi.resetModules();
    const mod = await import('../mockData');

    const apps = mod.resolveMock('/applications', 'get') as JobApplicationDTO[];
    const now = Date.now();
    for (const app of apps) {
      expect(Date.parse(app.createdAt)).toBeLessThanOrEqual(now);
      expect(Date.parse(app.updatedAt)).toBeLessThanOrEqual(now);
    }

    mod.resolveMock('/applications/10/status', 'patch', undefined, { status: 'OFFER' });
    const recent = mod.resolveMock('/applications/recent', 'get') as JobApplicationDTO[];
    expect(recent[0].id).toBe(10);
  });
});
