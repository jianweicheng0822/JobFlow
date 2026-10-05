import type {
  CompanyDTO,
  JobApplicationDTO,
  DashboardStatsDTO,
  ApplicationActivityDTO,
  InterviewDTO,
} from './types';

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
  return [
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
      createdAt: '2026-06-28T10:00:00Z', updatedAt: '2026-07-25T16:00:00Z', starred: false,
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
      createdAt: '2026-07-12T10:00:00Z', updatedAt: '2026-07-21T11:00:00Z', starred: false,
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
}

function createSeedInterviews(): InterviewDTO[] {
  return [
    {
      id: 1, jobApplicationId: 5, positionTitle: 'Senior Frontend Engineer',
      companyName: 'Apple', interviewDate: '2026-07-30T10:00:00Z',
      interviewType: 'ONSITE', notes: 'Bring portfolio',
      reminderEnabled: true, reminderHoursBefore: 24, reminderSent: false, daysUntil: 3,
    },
    {
      id: 2, jobApplicationId: 4, positionTitle: 'Software Engineer',
      companyName: 'Amazon', interviewDate: '2026-07-29T14:00:00Z',
      interviewType: 'PHONE', notes: 'Behavioral + coding',
      reminderEnabled: true, reminderHoursBefore: 24, reminderSent: false, daysUntil: 2,
    },
    {
      id: 3, jobApplicationId: 3, positionTitle: 'Product Manager',
      companyName: 'Meta', interviewDate: '2026-08-02T09:00:00Z',
      interviewType: 'VIDEO', notes: 'Case study round',
      reminderEnabled: false, reminderHoursBefore: 24, reminderSent: false, daysUntil: 6,
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

function computeStats(apps: JobApplicationDTO[]): DashboardStatsDTO {
  return {
    totalApplications: apps.length,
    inReview: apps.filter(a => a.status === 'IN_REVIEW').length,
    interviews: apps.filter(a => a.status === 'INTERVIEW' || a.status === 'PHONE_SCREEN').length,
    offers: apps.filter(a => a.status === 'OFFER').length,
    rejections: apps.filter(a => a.status === 'REJECTED').length,
    interviewRate: 20,
    offerRate: 10,
  };
}

// Mutable working copies that CRUD operations modify
let companies: CompanyDTO[] = createSeedCompanies();
let applications: JobApplicationDTO[] = createSeedApplications(companies);
let interviews: InterviewDTO[] = createSeedInterviews();
let activity: ApplicationActivityDTO[] = createSeedActivity();
let stats: DashboardStatsDTO = computeStats(applications);

// Reset all mock data back to initial seed state
export function resetMockData(): void {
  companies = createSeedCompanies();
  applications = createSeedApplications(companies);
  interviews = createSeedInterviews();
  activity = createSeedActivity();
  stats = computeStats(applications);
}

// Resolve mock API calls by URL pattern
export function resolveMock(url: string, method: string): unknown | undefined {
  if (method === 'get') {
    if (url === '/applications/stats') return stats;
    if (url === '/applications/recent') return applications.slice(0, 5);
    if (url === '/applications/activity') return activity;
    if (url === '/applications') return applications;
    if (url.match(/^\/applications\/\d+$/)) {
      const id = Number(url.split('/').pop());
      return applications.find(a => a.id === id);
    }
    if (url === '/companies') return companies;
    if (url.match(/^\/companies\/\d+$/)) {
      const id = Number(url.split('/').pop());
      return companies.find(c => c.id === id);
    }
    if (url === '/interviews') return interviews;
    if (url === '/interviews/upcoming') return interviews;
    if (url === '/auth/me') return { token: null, name: 'Demo User', email: 'demo@jobflow.com', avatarUrl: null, jobTitle: null, bio: null, hasPassword: true };
  }

  // ===== Application CRUD =====
  if (method === 'post' && url === '/applications') {
    const newApp: JobApplicationDTO = {
      ...applications[0],
      id: Date.now(),
      company: { id: Date.now(), name: 'New Company', logoUrl: null, location: null, website: null },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    applications.unshift(newApp);
    stats.totalApplications = applications.length;
    return newApp;
  }
  if (method === 'put' && url.match(/^\/applications\/\d+$/)) {
    return applications[0];
  }

  // ===== Interview CRUD =====
  if (method === 'post' && url === '/interviews') {
    const newInterview: InterviewDTO = {
      id: Date.now(),
      jobApplicationId: 1,
      positionTitle: 'New Interview',
      companyName: 'Company',
      interviewDate: new Date().toISOString(),
      interviewType: 'VIDEO',
      notes: null,
      reminderEnabled: false, reminderHoursBefore: 24, reminderSent: false, daysUntil: 7,
    };
    interviews.unshift(newInterview);
    return newInterview;
  }
  if (method === 'put' && url.match(/^\/interviews\/\d+$/)) {
    const id = Number(url.split('/').pop());
    const found = interviews.find(i => i.id === id);
    return found || interviews[0];
  }

  // ===== Company CRUD =====
  if (method === 'post' && url === '/companies') {
    const newCompany: CompanyDTO = {
      id: Date.now(),
      name: 'New Company',
      logoUrl: null,
      location: null,
      website: null,
    };
    companies.push(newCompany);
    return newCompany;
  }
  if (method === 'put' && url.match(/^\/companies\/\d+$/)) {
    const id = Number(url.split('/').pop());
    const found = companies.find(c => c.id === id);
    return found || companies[0];
  }

  // ===== Profile & Password =====
  if (method === 'put' && url === '/auth/profile') {
    return { token: null, name: 'Demo User', email: 'demo@jobflow.com', avatarUrl: null, jobTitle: null, bio: null, hasPassword: true };
  }
  if (method === 'put' && url === '/auth/password') {
    return {};
  }

  // ===== Generic delete =====
  if (method === 'delete') {
    if (url.match(/^\/interviews\/\d+$/)) {
      const id = Number(url.split('/').pop());
      const idx = interviews.findIndex(i => i.id === id);
      if (idx !== -1) interviews.splice(idx, 1);
    }
    if (url.match(/^\/companies\/\d+$/)) {
      const id = Number(url.split('/').pop());
      const idx = companies.findIndex(c => c.id === id);
      if (idx !== -1) companies.splice(idx, 1);
    }
    if (url.match(/^\/applications\/\d+$/)) {
      const id = Number(url.split('/').pop());
      const idx = applications.findIndex(a => a.id === id);
      if (idx !== -1) {
        applications.splice(idx, 1);
        stats.totalApplications = applications.length;
      }
    }
    return {};
  }

  return undefined;
}

export function isDemoMode(): boolean {
  return localStorage.getItem('jobflow-token') === 'demo-token';
}
