import client from './client';
import type {
  JobApplicationDTO,
  PageResponse,
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

export function getApplicationsPaged(
  page = 0,
  size = 20,
  status?: ApplicationStatus,
  keyword?: string,
  sortBy = 'updatedAt',
  sortDir = 'desc',
) {
  const params: Record<string, string | number> = { page, size, sortBy, sortDir };
  if (status) params.status = status;
  if (keyword) params.keyword = keyword;
  return client.get<PageResponse<JobApplicationDTO>>('/applications/page', { params });
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

export function deleteBatch(ids: number[]) {
  return client.delete('/applications/batch', { data: ids });
}

export function updateStatus(id: number, status: ApplicationStatus) {
  return client.patch<JobApplicationDTO>(`/applications/${id}/status`, null, { params: { status } });
}

// The star UI updates optimistically, so give up after 10s and let the caller roll back
const STAR_TIMEOUT_MS = 10_000;

export function toggleStar(id: number) {
  return client.patch<JobApplicationDTO>(`/applications/${id}/star`, null, { timeout: STAR_TIMEOUT_MS });
}

export function exportCsv() {
  return client.get('/applications/export', { responseType: 'blob' });
}
