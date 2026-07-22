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
  status: ApplicationStatus;
  appliedDate: string | null; // ISO date string
  lastAction: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewDTO {
  id: number;
  jobApplicationId: number;
  positionTitle: string;
  companyName: string;
  interviewDate: string; // ISO datetime string
  interviewType: InterviewType;
  notes: string | null;
}

export interface DashboardStatsDTO {
  totalApplications: number;
  inReview: number;
  interviews: number;
  offers: number;
  rejections: number;
}

export interface ApplicationActivityDTO {
  month: string;
  count: number;
}

// Request types for CRUD operations
export interface CreateJobApplicationRequest {
  positionTitle: string;
  companyId: number;
  location?: string;
  salary?: string;
  status?: ApplicationStatus;
  appliedDate?: string; // ISO date string (YYYY-MM-DD)
  lastAction?: string;
  notes?: string;
}

export interface UpdateJobApplicationRequest {
  positionTitle?: string;
  companyId?: number;
  location?: string;
  salary?: string;
  status?: ApplicationStatus;
  appliedDate?: string;
  lastAction?: string;
  notes?: string;
}
