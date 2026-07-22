import client from './client';
import type { InterviewDTO } from './types';

export function getInterviews() {
  return client.get<InterviewDTO[]>('/interviews');
}

export function getUpcomingInterviews() {
  return client.get<InterviewDTO[]>('/interviews/upcoming');
}
