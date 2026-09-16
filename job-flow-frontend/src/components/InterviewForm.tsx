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
import './ApplicationForm.css';

const TYPE_OPTIONS: { value: InterviewType; label: string }[] = [
  { value: 'PHONE', label: 'Phone' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'ONSITE', label: 'Onsite' },
];

interface InterviewFormProps {
  interview?: InterviewDTO;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function InterviewForm({ interview, onSuccess, onCancel }: InterviewFormProps) {
  const isEdit = !!interview;

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
    if (!jobApplicationId) newErrors.jobApplicationId = 'Please select a job application';
    if (!interviewDate) newErrors.interviewDate = 'Interview date is required';
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
      setErrors({ form: 'Failed to save. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="app-form" onSubmit={handleSubmit}>
      <div className="app-form-field">
        <label className="app-form-label">
          Job Application <span className="required">*</span>
        </label>
        <select
          className="app-form-select"
          value={jobApplicationId}
          onChange={(e) => setJobApplicationId(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">Select a job application</option>
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
            Interview Date <span className="required">*</span>
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
          <label className="app-form-label">Interview Type</label>
          <select
            className="app-form-select"
            value={interviewType}
            onChange={(e) => setInterviewType(e.target.value as InterviewType)}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="app-form-field">
        <label className="app-form-label">Notes</label>
        <textarea
          className="app-form-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this interview..."
        />
      </div>

      {errors.form && <span className="app-form-error">{errors.form}</span>}

      <div className="app-form-actions">
        <button type="button" className="app-form-btn app-form-btn--cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="app-form-btn app-form-btn--submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Schedule Interview'}
        </button>
      </div>
    </form>
  );
}
