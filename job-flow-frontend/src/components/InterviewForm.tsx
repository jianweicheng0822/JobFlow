import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { getApplications } from '../api/applications';
import { createInterview, updateInterview } from '../api/interviews';
import type {
  JobApplicationDTO,
  InterviewDTO,
  InterviewType,
  CreateInterviewRequest,
} from '../api/types';
import { useLanguage } from '../context/LanguageContext';
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
  const { t } = useLanguage();

  const [applications, setApplications] = useState<JobApplicationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form fields
  const [jobApplicationId, setJobApplicationId] = useState<number | ''>(interview?.jobApplicationId ?? '');
  const [interviewDate, setInterviewDate] = useState(
    interview?.interviewDate ? interview.interviewDate.slice(0, 16) : ''
  );
  const [interviewType, setInterviewType] = useState<InterviewType>(interview?.interviewType ?? 'VIDEO');
  const [notes, setNotes] = useState(interview?.notes ?? '');

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const data: CreateInterviewRequest = {
        jobApplicationId: jobApplicationId as number,
        interviewDate,
        interviewType,
        notes: notes.trim() || undefined,
      };

      if (isEdit) {
        await updateInterview(interview!.id, data);
      } else {
        await createInterview(data);
      }
      onSuccess();
    } catch (err) {
      console.error('Failed to save interview:', err);
      setErrors({ form: t.saveFailed });
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
