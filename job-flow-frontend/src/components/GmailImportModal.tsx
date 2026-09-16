import { useState } from 'react'
import { X, Check, Mail } from 'lucide-react'
import * as gmailApi from '../api/gmail'
import type { GmailImportPreview } from '../api/gmail'
import './GmailImportModal.css'

interface Props {
  previews: GmailImportPreview[]
  onClose: () => void
}

interface EditableRow extends GmailImportPreview {
  selected: boolean
}

export default function GmailImportModal({ previews, onClose }: Props) {
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
      setError(e.response?.data?.message || 'Import failed. Please try again.')
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
            {result ? 'Import Complete' : 'Gmail Scan Results'}
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
              Successfully imported <strong>{result.importedCount}</strong> application{result.importedCount !== 1 ? 's' : ''}.
              {result.skippedCount > 0 && (
                <> {result.skippedCount} already imported (skipped).</>
              )}
            </p>
            <button className="gmail-modal-btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        ) : previews.length === 0 ? (
          <div className="gmail-modal-empty">
            <Mail size={40} strokeWidth={1.5} />
            <p>No new application emails found in the last 90 days.</p>
            <button className="gmail-modal-btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="gmail-modal-body">
              <p className="gmail-modal-hint">
                Found {previews.length} application email{previews.length !== 1 ? 's' : ''}. Review and edit before importing.
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
                      <th>Company</th>
                      <th>Position</th>
                      <th>Date</th>
                      <th>Subject</th>
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
                Cancel
              </button>
              <button
                className="gmail-modal-btn-primary"
                onClick={handleImport}
                disabled={importing || selectedCount === 0}
              >
                {importing ? 'Importing...' : `Import ${selectedCount} Selected`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
