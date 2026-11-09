// Enums matching backend
export type ApplicationStatus =
  | 'APPLIED'
  | 'IN_REVIEW'
  | 'PHONE_SCREEN'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED';

export type InterviewType = 'PHONE' | 'VIDEO' | 'ONSITE';

// Response DTOs
export interface CompanyDTO {
  id: number;
  name: string;
  logoUrl: string | null;
  location: string | null;
  website: string | null;
}

export interface JobApplicationDTO {
  id: number;
  positionTitle: string;
  company: CompanyDTO;
  location: string | null;
  salary: string | null;
  salaryCurrency?: string | null; // "USD", "CNY"; missing on older rows
  status: ApplicationStatus;
  appliedDate: string | null; // ISO date string
  lastAction: string | null;
  notes: string | null;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewDTO {
  id: number;
  jobApplicationId: number;
  positionTitle: string;
  companyName: string;
  interviewDate: string; // wall-clock time as entered, on timeZone's clock
  timeZone?: string; // IANA zone the time was booked in, e.g. "America/Los_Angeles"
  startsAt?: string; // the same moment with its offset: "2026-11-10T10:00:00-08:00"
  interviewType: InterviewType;
  notes: string | null;
  reminderEnabled: boolean;
  reminderHoursBefore: number;
  reminderSent: boolean;
  daysUntil: number;
}

export interface DashboardStatsDTO {
  totalApplications: number;
  inReview: number;
  interviews: number;
  offers: number;
  rejections: number;
  // Applications past APPLIED, rejections included
  responded: number;
  // Percentages with one decimal; interviewRate counts offers too
  responseRate: number;
  interviewRate: number;
  offerRate: number;
}

export interface ApplicationActivityDTO {
  // "2026-10"
  yearMonth: string;
  count: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// Request types for CRUD operations
export interface CreateJobApplicationRequest {
  positionTitle: string;
  companyId?: number;
  companyName?: string;
  location?: string;
  salary?: string;
  salaryCurrency?: string;
  status?: ApplicationStatus;
  appliedDate?: string; // ISO date string (YYYY-MM-DD)
  lastAction?: string;
  notes?: string;
}

export interface UpdateJobApplicationRequest {
  positionTitle?: string;
  companyId?: number;
  companyName?: string; // used when no companyId: finds or creates the company
  location?: string;
  salary?: string;
  salaryCurrency?: string;
  status?: ApplicationStatus;
  appliedDate?: string;
  lastAction?: string;
  notes?: string;
}

export interface CreateInterviewRequest {
  jobApplicationId: number;
  interviewDate: string; // wall-clock time on timeZone's clock
  timeZone?: string; // leave out for the user's own zone
  interviewType: InterviewType;
  notes?: string;
  reminderEnabled?: boolean;
  reminderHoursBefore?: number;
}

export interface CreateCompanyRequest {
  name: string;
  logoUrl?: string;
  location?: string;
  website?: string;
}
