import client from './client';
import type { InterviewDTO, CreateInterviewRequest } from './types';

export function getInterviews() {
  return client.get<InterviewDTO[]>('/interviews');
}

export function getUpcomingInterviews() {
  return client.get<InterviewDTO[]>('/interviews/upcoming');
}

export function createInterview(data: CreateInterviewRequest) {
  return client.post<InterviewDTO>('/interviews', data);
}

export function updateInterview(id: number, data: CreateInterviewRequest) {
  return client.put<InterviewDTO>(`/interviews/${id}`, data);
}

export function deleteInterview(id: number) {
  return client.delete(`/interviews/${id}`);
}
