import { useState } from 'react'
import { X, Check, Mail } from 'lucide-react'
import * as gmailApi from '../api/gmail'
import type { GmailImportPreview } from '../api/gmail'
import { useLanguage } from '../context/LanguageContext'
import './GmailImportModal.css'

interface Props {
  previews: GmailImportPreview[]
  onClose: () => void
}

interface EditableRow extends GmailImportPreview {
  selected: boolean
}

export default function GmailImportModal({ previews, onClose }: Props) {
  const { t } = useLanguage()
  const [rows, setRows] = useState<EditableRow[]>(() =>
    previews.map((p) => ({ ...p, selected: true }))
  )
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<gmailApi.GmailImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedCount = rows.filter((r) => r.selected).length

  function toggleAll(checked: boolean) {
    setRows(rows.map((r) => ({ ...r, selected: checked })))
  }

  function toggleRow(index: number) {
    setRows(rows.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r)))
  }

  function updateField(index: number, field: keyof GmailImportPreview, value: string) {
    setRows(rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  async function handleImport() {
    const items = rows
      .filter((r) => r.selected)
      .map((r) => ({
        gmailMessageId: r.gmailMessageId,
        companyName: r.companyName,
        positionTitle: r.positionTitle,
        appliedDate: r.appliedDate,
      }))

    if (items.length === 0) return

    setImporting(true)
    setError(null)
    try {
      const res = await gmailApi.confirmImport(items)
      setResult(res.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message || t.importFailed)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="gmail-modal-overlay" onClick={onClose}>
      <div className="gmail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gmail-modal-header">
          <div className="gmail-modal-title">
            <Mail size={20} />
            {result ? t.importComplete : t.gmailScanResults}
          </div>
          <button className="gmail-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {result ? (
          <div className="gmail-modal-result">
            <div className="gmail-modal-result-icon">
              <Check size={32} />
            </div>
            <p className="gmail-modal-result-text">
              {t.importSuccess.replace('{count}', String(result.importedCount)).replace('{skipped}', String(result.skippedCount))}
            </p>
            <button className="gmail-modal-btn-primary" onClick={onClose}>
              {t.done}
            </button>
          </div>
        ) : previews.length === 0 ? (
          <div className="gmail-modal-empty">
            <Mail size={40} strokeWidth={1.5} />
            <p>{t.noNewEmails}</p>
            <button className="gmail-modal-btn-secondary" onClick={onClose}>
              {t.close}
            </button>
          </div>
        ) : (
          <>
            <div className="gmail-modal-body">
              <p className="gmail-modal-hint">
                {t.foundEmails.replace('{count}', String(previews.length))}
              </p>
              <div className="gmail-table-wrapper">
                <table className="gmail-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={selectedCount === rows.length}
                          onChange={(e) => toggleAll(e.target.checked)}
                        />
                      </th>
                      <th>{t.company}</th>
                      <th>{t.position}</th>
                      <th>{t.date}</th>
                      <th>{t.subject}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.gmailMessageId} className={row.selected ? '' : 'gmail-row-deselected'}>
                        <td>
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => toggleRow(i)}
                          />
                        </td>
                        <td>
                          <input
                            className="gmail-cell-input"
                            value={row.companyName}
                            onChange={(e) => updateField(i, 'companyName', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="gmail-cell-input"
                            value={row.positionTitle}
                            onChange={(e) => updateField(i, 'positionTitle', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="gmail-cell-input gmail-cell-date"
                            type="date"
                            value={row.appliedDate}
                            onChange={(e) => updateField(i, 'appliedDate', e.target.value)}
                          />
                        </td>
                        <td className="gmail-cell-subject" title={row.subject}>
                          {row.subject}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {error && (
              <div className="gmail-modal-error">{error}</div>
            )}

            <div className="gmail-modal-footer">
              <button className="gmail-modal-btn-secondary" onClick={onClose}>
                {t.cancel}
              </button>
              <button
                className="gmail-modal-btn-primary"
                onClick={handleImport}
                disabled={importing || selectedCount === 0}
              >
                {importing ? t.importing : t.importSelected.replace('{count}', String(selectedCount))}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
