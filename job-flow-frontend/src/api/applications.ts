import client from './client';
import type {
  JobApplicationDTO,
  DashboardStatsDTO,
  ApplicationActivityDTO,
  ApplicationStatus,
  CreateJobApplicationRequest,
  UpdateJobApplicationRequest,
} from './types';

export function getApplications(status?: ApplicationStatus) {
  const params = status ? { status } : {};
  return client.get<JobApplicationDTO[]>('/applications', { params });
}

export function getApplicationById(id: number) {
  return client.get<JobApplicationDTO>(`/applications/${id}`);
}

export function getStats() {
  return client.get<DashboardStatsDTO>('/applications/stats');
}

export function getRecentApplications() {
  return client.get<JobApplicationDTO[]>('/applications/recent');
}

export function getActivity() {
  return client.get<ApplicationActivityDTO[]>('/applications/activity');
}

export function createApplication(data: CreateJobApplicationRequest) {
  return client.post<JobApplicationDTO>('/applications', data);
}

export function updateApplication(id: number, data: UpdateJobApplicationRequest) {
  return client.put<JobApplicationDTO>(`/applications/${id}`, data);
}

export function deleteApplication(id: number) {
  return client.delete(`/applications/${id}`);
}
