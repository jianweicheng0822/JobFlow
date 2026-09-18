import { useState } from 'react';
import type { FormEvent } from 'react';
import { createCompany, updateCompany } from '../api/companies';
import type { CompanyDTO, CreateCompanyRequest } from '../api/types';
import { useLanguage } from '../context/LanguageContext';
import './ApplicationForm.css';

interface CompanyFormProps {
  company?: CompanyDTO;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CompanyForm({ company, onSuccess, onCancel }: CompanyFormProps) {
  const isEdit = !!company;
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(company?.name ?? '');
  const [location, setLocation] = useState(company?.location ?? '');
  const [website, setWebsite] = useState(company?.website ?? '');
  const [logoUrl, setLogoUrl] = useState(company?.logoUrl ?? '');

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t.companyNameRequired;
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
      setErrors({ form: t.saveFailed });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="app-form" onSubmit={handleSubmit}>
      <div className="app-form-field">
        <label className="app-form-label">
          {t.companyName} <span className="required">*</span>
        </label>
        <input
          className="app-form-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.companyNamePlaceholder}
        />
        {errors.name && <span className="app-form-error">{errors.name}</span>}
      </div>

      <div className="app-form-row">
        <div className="app-form-field">
          <label className="app-form-label">{t.location}</label>
          <input
            className="app-form-input"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t.companyLocationPlaceholder}
          />
        </div>
        <div className="app-form-field">
          <label className="app-form-label">{t.website}</label>
          <input
            className="app-form-input"
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder={t.websitePlaceholder}
          />
        </div>
      </div>

      <div className="app-form-field">
        <label className="app-form-label">{t.logoUrl}</label>
        <input
          className="app-form-input"
          type="text"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder={t.logoUrlPlaceholder}
        />
      </div>

      {errors.form && <span className="app-form-error">{errors.form}</span>}

      <div className="app-form-actions">
        <button type="button" className="app-form-btn app-form-btn--cancel" onClick={onCancel}>
          {t.cancel}
        </button>
        <button type="submit" className="app-form-btn app-form-btn--submit" disabled={loading}>
          {loading ? t.saving : isEdit ? t.save : t.addCompany}
        </button>
      </div>
    </form>
  );
}
