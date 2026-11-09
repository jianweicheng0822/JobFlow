import { useState, useEffect, useMemo } from 'react';
import type { FormEvent } from 'react';
import { getApplications } from '../api/applications';
import { createInterview, updateInterview } from '../api/interviews';
import { getErrorMessage } from '../api/client';
import type {
  JobApplicationDTO,
  InterviewDTO,
  InterviewType,
  CreateInterviewRequest,
} from '../api/types';
import { useLanguage } from '../context/LanguageContext';
import { useAuthProviders } from '../hooks/useAuthProviders';
import { COMMON_TIME_ZONES, allTimeZones } from '../data/timeZones';
import { currentTimeZone, zoneAbbreviation } from '../utils/date';
import './ApplicationForm.css';

const TYPE_VALUES: InterviewType[] = ['PHONE', 'VIDEO', 'ONSITE'];
const TYPE_LABEL_KEYS: Record<InterviewType, 'phone' | 'video' | 'onsite'> = {
  PHONE: 'phone',
  VIDEO: 'video',
  ONSITE: 'onsite',
};

interface InterviewFormProps {
  interview?: InterviewDTO;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function InterviewForm({ interview, onSuccess, onCancel }: InterviewFormProps) {
  const isEdit = !!interview;
  const { t, lang } = useLanguage();
  // Nothing would ever send the reminder on a server without mail settings
  const canRemind = useAuthProviders()?.emailReminders === true;

  const [applications, setApplications] = useState<JobApplicationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form fields
  const [jobApplicationId, setJobApplicationId] = useState<number | ''>(interview?.jobApplicationId ?? '');
  const [interviewDate, setInterviewDate] = useState(
    interview?.interviewDate ? interview.interviewDate.slice(0, 16) : ''
  );
  // The time is read on this zone's clock; the user's own unless it was booked
  // with, say, a US company in Pacific time
  const myZone = currentTimeZone();
  const [timeZone, setTimeZone] = useState(interview?.timeZone ?? myZone);
  const [interviewType, setInterviewType] = useState<InterviewType>(interview?.interviewType ?? 'VIDEO');
  const [notes, setNotes] = useState(interview?.notes ?? '');
  const [reminderEnabled, setReminderEnabled] = useState(interview?.reminderEnabled ?? false);
  const [reminderHoursBefore, setReminderHoursBefore] = useState(interview?.reminderHoursBefore ?? 24);

  useEffect(() => {
    getApplications().then((res) => setApplications(res.data));
  }, []);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!jobApplicationId) newErrors.jobApplicationId = t.selectJobApplicationRequired;
    if (!interviewDate) newErrors.interviewDate = t.interviewDateRequired;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const zoneLabel = (zone: string) => {
    const common = COMMON_TIME_ZONES.find((z) => z.zone === zone);
    const name = common ? common[lang] : zone.replace(/_/g, ' ');
    return `${name} (${zoneAbbreviation(zone, lang)})`;
  };
  const commonZones = COMMON_TIME_ZONES.map((z) => z.zone).filter((z) => z !== myZone);
  const otherZones = useMemo(() => {
    const shown = new Set([myZone, ...COMMON_TIME_ZONES.map((z) => z.zone)]);
    return allTimeZones().filter((z) => !shown.has(z));
  }, [myZone]);
  // An old interview could carry a zone this browser doesn't list; keep it selectable
  const unlistedZone = timeZone !== myZone && !commonZones.includes(timeZone) && !otherZones.includes(timeZone);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const data: CreateInterviewRequest = {
        jobApplicationId: jobApplicationId as number,
        interviewDate,
        timeZone,
        interviewType,
        // "" clears the notes on edit; undefined would keep the old value
        notes: notes.trim(),
        reminderEnabled,
        reminderHoursBefore: reminderEnabled ? reminderHoursBefore : undefined,
      };

      if (isEdit) {
        await updateInterview(interview!.id, data);
      } else {
        await createInterview(data);
      }
      onSuccess();
    } catch (err) {
      console.error('Failed to save interview:', err);
      // Show the backend's reason (e.g. "Interview date is required") when there is one
      setErrors({ form: getErrorMessage(err, t.saveFailed) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="app-form" onSubmit={handleSubmit}>
      <div className="app-form-field">
        <label className="app-form-label">
          {t.jobApplication} <span className="required">*</span>
        </label>
        <select
          className="app-form-select"
          value={jobApplicationId}
          onChange={(e) => setJobApplicationId(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">{t.selectJobApplication}</option>
          {applications.map((app) => (
            <option key={app.id} value={app.id}>
              {app.positionTitle} - {app.company.name}
            </option>
          ))}
        </select>
        {errors.jobApplicationId && <span className="app-form-error">{errors.jobApplicationId}</span>}
      </div>

      <div className="app-form-row">
        <div className="app-form-field">
          <label className="app-form-label">
            {t.interviewDate} <span className="required">*</span>
          </label>
          <input
            className="app-form-input"
            type="datetime-local"
            value={interviewDate}
            onChange={(e) => setInterviewDate(e.target.value)}
          />
          {errors.interviewDate && <span className="app-form-error">{errors.interviewDate}</span>}
        </div>
        <div className="app-form-field">
          <label className="app-form-label" htmlFor="interview-time-zone">{t.interviewTimeZone}</label>
          <select
            id="interview-time-zone"
            className="app-form-select"
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
          >
            <option value={myZone}>{t.myTimeZone} · {zoneLabel(myZone)}</option>
            {unlistedZone && <option value={timeZone}>{zoneLabel(timeZone)}</option>}
            {commonZones.map((z) => (
              <option key={z} value={z}>{zoneLabel(z)}</option>
            ))}
            {otherZones.length > 0 && (
              <optgroup label={t.allTimeZones}>
                {otherZones.map((z) => (
                  <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>
      <span className="app-form-hint">{t.interviewTimeZoneHint}</span>

      <div className="app-form-field">
        <label className="app-form-label">{t.interviewType}</label>
        <select
          className="app-form-select"
          value={interviewType}
          onChange={(e) => setInterviewType(e.target.value as InterviewType)}
        >
          {TYPE_VALUES.map((val) => (
            <option key={val} value={val}>{t[TYPE_LABEL_KEYS[val]]}</option>
          ))}
        </select>
      </div>

      <div className="app-form-field">
        <label className="app-form-label">{t.notes}</label>
        <textarea
          className="app-form-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t.interviewNotesPlaceholder}
        />
      </div>

      {canRemind && (
        <div className="app-form-field">
          <label className="app-form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
            />
            {t.enableReminder || 'Enable email reminder'}
          </label>
        </div>
      )}

      {canRemind && reminderEnabled && (
        <div className="app-form-field">
          <label className="app-form-label">{t.remindBefore || 'Remind me before'}</label>
          <select
            className="app-form-select"
            value={reminderHoursBefore}
            onChange={(e) => setReminderHoursBefore(Number(e.target.value))}
          >
            <option value={1}>{t.oneHour || '1 hour'}</option>
            <option value={6}>{t.sixHours || '6 hours'}</option>
            <option value={24}>{t.twentyFourHours || '24 hours'}</option>
          </select>
        </div>
      )}

      {errors.form && <span className="app-form-error">{errors.form}</span>}

      <div className="app-form-actions">
        <button type="button" className="app-form-btn app-form-btn--cancel" onClick={onCancel}>
          {t.cancel}
        </button>
        <button type="submit" className="app-form-btn app-form-btn--submit" disabled={loading}>
          {loading ? t.saving : isEdit ? t.save : t.scheduleInterview}
        </button>
      </div>
    </form>
  );
}
