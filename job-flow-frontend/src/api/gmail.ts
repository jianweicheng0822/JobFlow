import client from './client'

export interface GmailImportPreview {
  gmailMessageId: string
  subject: string
  from: string
  companyName: string
  positionTitle: string
  appliedDate: string
}

export interface GmailImportItem {
  gmailMessageId: string
  companyName: string
  positionTitle: string
  appliedDate: string
}

export interface GmailImportResult {
  importedCount: number
  skippedCount: number
}

export interface GmailStatus {
  gmailConnected: boolean
  provider: string
}

export const scanGmail = () =>
  client.post<GmailImportPreview[]>('/gmail/scan')

export const confirmImport = (items: GmailImportItem[]) =>
  client.post<GmailImportResult>('/gmail/import', { items })

export const getGmailStatus = () =>
  client.get<GmailStatus>('/gmail/status')

export const getGmailLinkUrl = () =>
  client.get<{ authUrl: string }>('/gmail/link')
