import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { getCompanies } from '../api/companies';
import { createApplication, updateApplication } from '../api/applications';
import type {
  CompanyDTO,
  JobApplicationDTO,
  ApplicationStatus,
  CreateJobApplicationRequest,
  UpdateJobApplicationRequest,
} from '../api/types';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../api/client';
import './ApplicationForm.css';

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'APPLIED', label: 'Applied' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'PHONE_SCREEN', label: 'Phone Screen' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'OFFER', label: 'Offer' },
  { value: 'REJECTED', label: 'Rejected' },
];

interface ApplicationFormProps {
  application?: JobApplicationDTO; // if provided, we're in edit mode
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ApplicationForm({ application, onSuccess, onCancel }: ApplicationFormProps) {
  const isEdit = !!application;
  const { showToast } = useToast();

  const [companies, setCompanies] = useState<CompanyDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form fields
  const [positionTitle, setPositionTitle] = useState(application?.positionTitle ?? '');
  const [companyInput, setCompanyInput] = useState(application?.company?.name ?? '');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(application?.company?.id ?? null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useState(application?.location ?? '');
  const [salary, setSalary] = useState(application?.salary ?? '');
  const [status, setStatus] = useState<ApplicationStatus>(application?.status ?? 'APPLIED');
  const [appliedDate, setAppliedDate] = useState(application?.appliedDate ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(application?.notes ?? '');

  useEffect(() => {
    getCompanies().then((res) => setCompanies(res.data));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companyInput.toLowerCase())
  );

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!positionTitle.trim()) newErrors.positionTitle = 'Position title is required';
    if (!companyInput.trim()) newErrors.company = 'Company is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const data: Record<string, unknown> = {
        positionTitle: positionTitle.trim(),
        location: location.trim() || undefined,
        salary: salary.trim() || undefined,
        status,
        appliedDate: appliedDate || undefined,
        notes: notes.trim() || undefined,
      };

      // Use companyId if an existing company was selected, otherwise use companyName
      if (selectedCompanyId) {
        data.companyId = selectedCompanyId;
      } else {
        data.companyName = companyInput.trim();
      }

      if (isEdit) {
        await updateApplication(application!.id, data as UpdateJobApplicationRequest);
        showToast('Application updated', 'success');
      } else {
        await createApplication(data as CreateJobApplicationRequest);
        showToast('Application created', 'success');
      }
      onSuccess();
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to save application');
      setErrors({ form: msg });
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="app-form" onSubmit={handleSubmit}>
      <div className="app-form-field">
        <label className="app-form-label">
          Position Title <span className="required">*</span>
        </label>
        <input
          className="app-form-input"
          type="text"
          value={positionTitle}
          onChange={(e) => setPositionTitle(e.target.value)}
          placeholder="e.g. Frontend Developer"
        />
        {errors.positionTitle && <span className="app-form-error">{errors.positionTitle}</span>}
      </div>

      <div className="app-form-field" ref={dropdownRef}>
        <label className="app-form-label">
          Company <span className="required">*</span>
        </label>
        <input
          className="app-form-input"
          type="text"
          value={companyInput}
          onChange={(e) => {
            setCompanyInput(e.target.value);
            setSelectedCompanyId(null);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Type to search or enter a new company"
          autoComplete="off"
        />
        {showDropdown && companyInput.trim() && (
          <div className="company-dropdown">
            {filteredCompanies.map((c) => (
              <div
                key={c.id}
                className="company-dropdown-item"
                onMouseDown={() => {
                  setCompanyInput(c.name);
                  setSelectedCompanyId(c.id);
                  setShowDropdown(false);
                }}
              >
                {c.name}
                {c.location && <span className="company-dropdown-loc">{c.location}</span>}
              </div>
            ))}
            {filteredCompanies.length === 0 && (
              <div className="company-dropdown-new">
                + Add "{companyInput.trim()}" as new company
              </div>
            )}
          </div>
        )}
        {errors.company && <span className="app-form-error">{errors.company}</span>}
      </div>

      <div className="app-form-row">
        <div className="app-form-field">
          <label className="app-form-label">Location</label>
          <input
            className="app-form-input"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. San Francisco, CA"
          />
        </div>
        <div className="app-form-field">
          <label className="app-form-label">Salary</label>
          <input
            className="app-form-input"
            type="text"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            placeholder="e.g. $120,000"
          />
        </div>
      </div>

      <div className="app-form-row">
        <div className="app-form-field">
          <label className="app-form-label">Status</label>
          <select
            className="app-form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="app-form-field">
          <label className="app-form-label">Applied Date</label>
          <input
            className="app-form-input"
            type="date"
            value={appliedDate}
            onChange={(e) => setAppliedDate(e.target.value)}
          />
        </div>
      </div>

      <div className="app-form-field">
        <label className="app-form-label">Notes</label>
        <textarea
          className="app-form-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes..."
        />
      </div>

      {errors.form && <span className="app-form-error">{errors.form}</span>}

      <div className="app-form-actions">
        <button type="button" className="app-form-btn app-form-btn--cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="app-form-btn app-form-btn--submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Application'}
        </button>
      </div>
    </form>
  );
}
