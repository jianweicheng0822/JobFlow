import type { ApplicationStatus, JobApplicationDTO } from '../api/types'
import type { Translations } from '../context/LanguageContext'

// Order and colors for the Analytics status pie. Phone Screen gets its own color
// here because the amber used elsewhere is shared with In Review.
const STATUS_SLICES: { status: ApplicationStatus; labelKey: keyof Translations; color: string }[] = [
  { status: 'APPLIED', labelKey: 'statusApplied', color: '#4f6ef7' },
  { status: 'IN_REVIEW', labelKey: 'statusInReview', color: '#f59e0b' },
  { status: 'PHONE_SCREEN', labelKey: 'statusPhoneScreen', color: '#06b6d4' },
  { status: 'INTERVIEW', labelKey: 'statusInterview', color: '#10b981' },
  { status: 'OFFER', labelKey: 'statusOffer', color: '#8b5cf6' },
  { status: 'REJECTED', labelKey: 'statusRejected', color: '#ef4444' },
]

export interface StatusSlice {
  name: string
  value: number
  color: string
}

// Counts straight from the application list, so every status gets its own slice
// (the stats endpoint has no Phone Screen count). Empty statuses are left out.
export function buildStatusDistribution(apps: JobApplicationDTO[], t: Translations): StatusSlice[] {
  const counts: Partial<Record<ApplicationStatus, number>> = {}
  apps.forEach((app) => {
    counts[app.status] = (counts[app.status] ?? 0) + 1
  })
  return STATUS_SLICES
    .map(({ status, labelKey, color }) => ({ name: t[labelKey], value: counts[status] ?? 0, color }))
    .filter((slice) => slice.value > 0)
}
