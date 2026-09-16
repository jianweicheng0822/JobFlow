import client from './client';
import type { CompanyDTO, CreateCompanyRequest } from './types';

export function getCompanies() {
  return client.get<CompanyDTO[]>('/companies');
}

export function getCompanyById(id: number) {
  return client.get<CompanyDTO>(`/companies/${id}`);
}

export function createCompany(data: CreateCompanyRequest) {
  return client.post<CompanyDTO>('/companies', data);
}

export function updateCompany(id: number, data: CreateCompanyRequest) {
  return client.put<CompanyDTO>(`/companies/${id}`, data);
}

export function deleteCompany(id: number) {
  return client.delete(`/companies/${id}`);
}
