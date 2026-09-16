import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { resolveMock as ResolveMockFn, isDemoMode as IsDemoModeFn } from '../mockData';
import type {
  JobApplicationDTO,
  InterviewDTO,
  CompanyDTO,
  DashboardStatsDTO,
} from '../types';

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
