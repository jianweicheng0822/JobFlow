import type {
  CompanyDTO,
  JobApplicationDTO,
  DashboardStatsDTO,
  ApplicationActivityDTO,
  InterviewDTO,
} from './types';

const companies: CompanyDTO[] = [
  { id: 1, name: 'Google', logoUrl: null, location: 'Seattle, WA', website: 'https://google.com' },
  { id: 2, name: 'Spotify', logoUrl: null, location: 'Stockholm', website: 'https://spotify.com' },
  { id: 3, name: 'Meta', logoUrl: null, location: 'Menlo Park, CA', website: 'https://meta.com' },
  { id: 4, name: 'Amazon', logoUrl: null, location: 'Seattle, WA', website: 'https://amazon.com' },
  { id: 5, name: 'Apple', logoUrl: null, location: 'Cupertino, CA', website: 'https://apple.com' },
  { id: 6, name: 'Netflix', logoUrl: null, location: 'Los Gatos, CA', website: 'https://netflix.com' },
  { id: 7, name: 'Microsoft', logoUrl: null, location: 'Redmond, WA', website: 'https://microsoft.com' },
];

const applications: JobApplicationDTO[] = [
  {
    id: 1, positionTitle: 'Senior UX Designer', company: companies[0],
    location: 'Seattle, WA', salary: '$145,000', status: 'APPLIED',
    appliedDate: '2026-07-15', lastAction: 'Applied', notes: null,
    createdAt: '2026-07-15T10:00:00Z', updatedAt: '2026-07-15T10:00:00Z',
  },
  {
    id: 2, positionTitle: 'Frontend Engineer', company: companies[1],
    location: 'Stockholm', salary: '$120,000', status: 'APPLIED',
    appliedDate: '2026-07-18', lastAction: 'Applied', notes: null,
    createdAt: '2026-07-18T09:00:00Z', updatedAt: '2026-07-18T09:00:00Z',
  },
  {
    id: 3, positionTitle: 'Product Manager', company: companies[2],
    location: 'Menlo Park, CA', salary: '$160,000', status: 'IN_REVIEW',
    appliedDate: '2026-07-10', lastAction: 'Recruiter contacted', notes: null,
    createdAt: '2026-07-10T08:00:00Z', updatedAt: '2026-07-20T14:00:00Z',
  },
  {
    id: 4, positionTitle: 'Software Engineer', company: companies[3],
    location: 'Seattle, WA', salary: '$155,000', status: 'PHONE_SCREEN',
    appliedDate: '2026-07-05', lastAction: 'Phone screen scheduled', notes: null,
    createdAt: '2026-07-05T11:00:00Z', updatedAt: '2026-07-22T09:00:00Z',
  },
  {
    id: 5, positionTitle: 'Senior Frontend Engineer', company: companies[4],
    location: 'Cupertino, CA', salary: '$170,000', status: 'INTERVIEW',
    appliedDate: '2026-06-28', lastAction: 'Interview Scheduled', notes: 'Onsite round 2',
    createdAt: '2026-06-28T10:00:00Z', updatedAt: '2026-07-25T16:00:00Z',
  },
  {
    id: 6, positionTitle: 'Full Stack Developer', company: companies[5],
    location: 'Los Gatos, CA', salary: '$140,000', status: 'OFFER',
    appliedDate: '2026-06-15', lastAction: 'Offer received', notes: 'Negotiating salary',
    createdAt: '2026-06-15T09:00:00Z', updatedAt: '2026-07-26T10:00:00Z',
  },
  {
    id: 7, positionTitle: 'Backend Engineer', company: companies[6],
    location: 'Redmond, WA', salary: '$150,000', status: 'REJECTED',
    appliedDate: '2026-06-20', lastAction: 'Rejected after final round', notes: null,
    createdAt: '2026-06-20T08:00:00Z', updatedAt: '2026-07-18T12:00:00Z',
  },
  {
    id: 8, positionTitle: 'Data Analyst', company: companies[0],
    location: 'Seattle, WA', salary: '$125,000', status: 'IN_REVIEW',
    appliedDate: '2026-07-12', lastAction: 'Resume reviewed', notes: null,
    createdAt: '2026-07-12T10:00:00Z', updatedAt: '2026-07-21T11:00:00Z',
  },
  {
    id: 9, positionTitle: 'DevOps Engineer', company: companies[3],
    location: 'Seattle, WA', salary: '$135,000', status: 'APPLIED',
    appliedDate: '2026-07-22', lastAction: 'Applied', notes: null,
    createdAt: '2026-07-22T14:00:00Z', updatedAt: '2026-07-22T14:00:00Z',
  },
  {
    id: 10, positionTitle: 'UX Researcher', company: companies[2],
    location: 'Menlo Park, CA', salary: '$130,000', status: 'REJECTED',
    appliedDate: '2026-06-10', lastAction: 'Rejected', notes: null,
    createdAt: '2026-06-10T09:00:00Z', updatedAt: '2026-07-01T15:00:00Z',
  },
];

const stats: DashboardStatsDTO = {
  totalApplications: applications.length,
  inReview: applications.filter(a => a.status === 'IN_REVIEW').length,
  interviews: applications.filter(a => a.status === 'INTERVIEW' || a.status === 'PHONE_SCREEN').length,
  offers: applications.filter(a => a.status === 'OFFER').length,
  rejections: applications.filter(a => a.status === 'REJECTED').length,
};

const activity: ApplicationActivityDTO[] = [
  { month: 'Jan', count: 3 },
  { month: 'Feb', count: 5 },
  { month: 'Mar', count: 8 },
  { month: 'Apr', count: 6 },
  { month: 'May', count: 10 },
  { month: 'Jun', count: 7 },
  { month: 'Jul', count: 4 },
];

const interviews: InterviewDTO[] = [
  {
    id: 1, jobApplicationId: 5, positionTitle: 'Senior Frontend Engineer',
    companyName: 'Apple', interviewDate: '2026-07-30T10:00:00Z',
    interviewType: 'ONSITE', notes: 'Bring portfolio',
  },
  {
    id: 2, jobApplicationId: 4, positionTitle: 'Software Engineer',
    companyName: 'Amazon', interviewDate: '2026-07-29T14:00:00Z',
    interviewType: 'PHONE', notes: 'Behavioral + coding',
  },
  {
    id: 3, jobApplicationId: 3, positionTitle: 'Product Manager',
    companyName: 'Meta', interviewDate: '2026-08-02T09:00:00Z',
    interviewType: 'VIDEO', notes: 'Case study round',
  },
];

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
    if (url === '/auth/me') return { token: null, name: 'Demo User', email: 'demo@jobflow.com', avatarUrl: null };
  }

  // For write operations in demo mode, return a plausible response
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
  if (method === 'delete') {
    return {};
  }

  return undefined;
}

export function isDemoMode(): boolean {
  return localStorage.getItem('jobflow-token') === 'demo-token';
}
