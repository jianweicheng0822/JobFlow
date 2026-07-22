import client from './client';
import type { CompanyDTO } from './types';

export function getCompanies() {
  return client.get<CompanyDTO[]>('/companies');
}

export function getCompanyById(id: number) {
  return client.get<CompanyDTO>(`/companies/${id}`);
}
