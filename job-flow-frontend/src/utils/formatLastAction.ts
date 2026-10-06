import type { ApplicationStatus } from '../api/types'
import type { Translations } from '../context/LanguageContext'

// lastAction is stored as plain English text, so we translate it at display time.
// Keep the "Moved to ..." format in sync with JobApplicationService.changeStatus
// on the backend and lastActionAfter in api/mockData.ts.

type TranslationKey = keyof Translations

const STATUS_KEYS: Record<ApplicationStatus, TranslationKey> = {
  APPLIED: 'statusApplied',
  IN_REVIEW: 'statusInReview',
  PHONE_SCREEN: 'statusPhoneScreen',
  INTERVIEW: 'statusInterview',
  OFFER: 'statusOffer',
  REJECTED: 'statusRejected',
}

// Fixed phrases used by the backend DataInitializer and the demo seed data
const KNOWN_ACTIONS: Record<string, TranslationKey> = {
  'applied': 'actionApplied',
  'application submitted': 'actionApplicationSubmitted',
  'under review': 'actionUnderReview',
  'resume reviewed': 'actionResumeReviewed',
  'recruiter contacted': 'actionRecruiterContacted',
  'phone screen scheduled': 'actionPhoneScreenScheduled',
  'phone screen completed': 'actionPhoneScreenCompleted',
  'interview scheduled': 'actionInterviewScheduled',
  'technical interview': 'actionTechnicalInterview',
  'offer received': 'actionOfferReceived',
  'rejected': 'actionRejected',
  'rejected after interview': 'actionRejectedAfterInterview',
  'rejected after final round': 'actionRejectedAfterFinalRound',
}

// PHONE_SCREEN -> "phone screen", same wording the backend writes (lowercased for matching)
function statusFromLabel(label: string): ApplicationStatus | undefined {
  const wanted = label.trim().toLowerCase()
  return (Object.keys(STATUS_KEYS) as ApplicationStatus[]).find(
    (s) => s.replace(/_/g, ' ').toLowerCase() === wanted,
  )
}

const MOVED_TO = /^moved to (.+)$/i

export function formatLastAction(text: string | null, t: Translations): string {
  if (!text) return ''
  const trimmed = text.trim()

  const moved = MOVED_TO.exec(trimmed)
  if (moved) {
    const status = statusFromLabel(moved[1])
    if (status) return t.movedTo.replace('{status}', t[STATUS_KEYS[status]])
  }

  const key = KNOWN_ACTIONS[trimmed.toLowerCase()]
  if (key) return t[key]

  // Anything we don't recognize is shown as-is
  return text
}
