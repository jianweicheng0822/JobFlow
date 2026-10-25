import './Sparkline.css'

interface SparklineProps {
  values: number[]
  // Spoken summary for screen readers, e.g. "Applications per week: 1, 0, 3"
  label: string
  // Hover text for each point, same length as values
  pointTitles: string[]
}

const WIDTH = 96
const HEIGHT = 28
const PAD = 3

// A small line of real values. The line stays muted and only the latest point
// is highlighted, so the eye lands on "now" first.
export default function Sparkline({ values, label, pointTitles }: SparklineProps) {
  if (values.length === 0) return null

  const max = Math.max(...values, 1)
  const step = values.length > 1 ? (WIDTH - PAD * 2) / (values.length - 1) : 0
  const points = values.map((v, i) => ({
    x: PAD + i * step,
    y: HEIGHT - PAD - (v / max) * (HEIGHT - PAD * 2),
  }))
  const last = points[points.length - 1]

  return (
    <svg className="sparkline" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label}>
      <polyline
        className="sparkline-line"
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
      />
      <circle className="sparkline-dot" cx={last.x} cy={last.y} r="3" />
      {/* Invisible columns wider than the line, so each week is easy to hover */}
      {points.map((p, i) => (
        <rect
          key={i}
          className="sparkline-hit"
          x={p.x - step / 2}
          y={0}
          width={Math.max(step, 8)}
          height={HEIGHT}
        >
          <title>{pointTitles[i]}</title>
        </rect>
      ))}
    </svg>
  )
}
