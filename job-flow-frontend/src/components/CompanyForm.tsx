import { useState } from 'react';
import type { FormEvent } from 'react';
import { createCompany, updateCompany } from '../api/companies';
import type { CompanyDTO, CreateCompanyRequest } from '../api/types';
import './ApplicationForm.css';

interface CompanyFormProps {
  company?: CompanyDTO;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CompanyForm({ company, onSuccess, onCancel }: CompanyFormProps) {
  const isEdit = !!company;

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(company?.name ?? '');
  const [location, setLocation] = useState(company?.location ?? '');
  const [website, setWebsite] = useState(company?.website ?? '');
  const [logoUrl, setLogoUrl] = useState(company?.logoUrl ?? '');

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Company name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const data: CreateCompanyRequest = {
        name: name.trim(),
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
      };

      if (isEdit) {
        await updateCompany(company!.id, data);
      } else {
        await createCompany(data);
      }
      onSuccess();
    } catch (err) {
      console.error('Failed to save company:', err);
      setErrors({ form: 'Failed to save. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="app-form" onSubmit={handleSubmit}>
      <div className="app-form-field">
        <label className="app-form-label">
          Company Name <span className="required">*</span>
        </label>
        <input
          className="app-form-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Google"
        />
        {errors.name && <span className="app-form-error">{errors.name}</span>}
      </div>

      <div className="app-form-row">
        <div className="app-form-field">
          <label className="app-form-label">Location</label>
          <input
            className="app-form-input"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Mountain View, CA"
          />
        </div>
        <div className="app-form-field">
          <label className="app-form-label">Website</label>
          <input
            className="app-form-input"
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="e.g. https://google.com"
          />
        </div>
      </div>

      <div className="app-form-field">
        <label className="app-form-label">Logo URL</label>
        <input
          className="app-form-input"
          type="text"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="e.g. https://example.com/logo.png"
        />
      </div>

      {errors.form && <span className="app-form-error">{errors.form}</span>}

      <div className="app-form-actions">
        <button type="button" className="app-form-btn app-form-btn--cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="app-form-btn app-form-btn--submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Company'}
        </button>
      </div>
    </form>
  );
}
