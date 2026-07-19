import './Jobs.css'

// ===== Types =====
interface JobPosition {
  id: number
  title: string
  company: string
  companyInitial: string
  companyColor: string
  location: string
  dateApplied: string
  stage: string
  stageColor: string
}

// ===== Mock Data =====
const jobPositions: JobPosition[] = [
  { id: 1, title: 'Senior Product Manager', company: 'Acme Corp', companyInitial: 'A', companyColor: '#4f6ef7', location: 'Stockholm', dateApplied: 'Aug 15, 2023', stage: 'Processing', stageColor: '#f59e0b' },
  { id: 2, title: 'Senior Product Manager', company: 'TechCorp', companyInitial: 'T', companyColor: '#10b981', location: 'Stockholm', dateApplied: 'Aug 15, 2023', stage: 'Processing', stageColor: '#f59e0b' },
  { id: 3, title: 'Frontend Engineer', company: 'Spotify', companyInitial: 'S', companyColor: '#1DB954', location: 'Stockholm', dateApplied: 'Aug 15, 2023', stage: 'Applied', stageColor: '#10b981' },
  { id: 4, title: 'UX Designer', company: 'Google', companyInitial: 'G', companyColor: '#4285F4', location: 'Mountain View', dateApplied: 'Aug 14, 2023', stage: 'Interview', stageColor: 'var(--status-interview)' },
  { id: 5, title: 'Senior Product Manager', company: 'Acme Corp', companyInitial: 'A', companyColor: '#4f6ef7', location: 'Stockholm', dateApplied: 'Aug 13, 2023', stage: 'Applied', stageColor: '#10b981' },
  { id: 6, title: 'Data Analyst', company: 'Meta', companyInitial: 'M', companyColor: '#0668E1', location: 'London', dateApplied: 'Aug 12, 2023', stage: 'Processing', stageColor: '#f59e0b' },
  { id: 7, title: 'Backend Developer', company: 'TechCorp', companyInitial: 'T', companyColor: '#10b981', location: 'Stockholm', dateApplied: 'Aug 11, 2023', stage: 'Applied', stageColor: '#10b981' },
  { id: 8, title: 'Product Designer', company: 'Amazon', companyInitial: 'A', companyColor: '#ff9900', location: 'Seattle', dateApplied: 'Aug 10, 2023', stage: 'Interview', stageColor: 'var(--status-interview)' },
  { id: 9, title: 'Full Stack Engineer', company: 'Spotify', companyInitial: 'S', companyColor: '#1DB954', location: 'Stockholm', dateApplied: 'Aug 9, 2023', stage: 'Applied', stageColor: '#10b981' },
]

const jobsStatCards = [
  {
    label: 'Active Applications',
    value: 186,
    icon: 'active' as const,
    trend: 'up' as const,
  },
  {
    label: 'Saved Jobs',
    value: 32,
    icon: 'saved' as const,
    trend: 'up' as const,
  },
  {
    label: 'Closed',
    value: 47,
    icon: 'closed' as const,
    trend: 'down' as const,
  },
]

function JobsStatIcon({ type }: { type: string }) {
  switch (type) {
    case 'active':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    case 'saved':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      )
    case 'closed':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      )
    default:
      return null
  }
}

function JobsTrendLine({ direction }: { direction: 'up' | 'down' }) {
  return (
    <div className={`jobs-stat-card-trend jobs-stat-card-trend--${direction}`}>
      <svg viewBox="0 0 32 20" fill="none">
        {direction === 'up' ? (
          <polyline
            points="2,16 8,12 14,14 20,8 26,4 30,2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <polyline
            points="2,4 8,6 14,8 20,14 26,16 30,18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  )
}

export default function Jobs() {
  return (
    <div className="jobs-page">
      {/* Stat Cards */}
      <div className="jobs-stat-cards">
        {jobsStatCards.map((card) => (
          <div className="jobs-stat-card" key={card.label}>
            <div className={`jobs-stat-card-icon jobs-stat-card-icon--${card.icon}`}>
              <JobsStatIcon type={card.icon} />
            </div>
            <div className="jobs-stat-card-info">
              <div className="jobs-stat-card-label">{card.label}</div>
              <div className="jobs-stat-card-value">{card.value}</div>
            </div>
            <JobsTrendLine direction={card.trend} />
          </div>
        ))}
      </div>

      {/* Job Positions Table */}
      <div className="jobs-table-section">
        <div className="jobs-section-header">
          <h2 className="jobs-section-title">Job Positions</h2>
          <a href="#" className="jobs-section-link">View All ▾</a>
        </div>
        <div className="jobs-table-wrapper">
          <table className="jobs-table">
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Company Logo</th>
                <th>Location</th>
                <th>Date Applied ↕</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {jobPositions.map((job) => (
                <tr key={job.id}>
                  <td>
                    <div className="jobs-title-cell">
                      <span className="jobs-title-name">{job.title}</span>
                      <span className="jobs-title-company">{job.company}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className="jobs-company-logo"
                      style={{ background: job.companyColor }}
                    >
                      {job.companyInitial}
                    </span>
                  </td>
                  <td>{job.location}</td>
                  <td>{job.dateApplied}</td>
                  <td>
                    <span
                      className="jobs-stage-badge"
                      style={{ background: job.stageColor }}
                    >
                      {job.stage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
