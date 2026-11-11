// The JobFlow mark: three pipeline columns, tallest first, like applications
// thinning out from Applied to Offer. The blue square around it comes from the
// parent (.sidebar-logo-icon, .auth-logo-icon); public/favicon.svg draws the same shape.
export default function BrandMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="8 8 16 16" fill="currentColor" aria-hidden="true">
      <rect x="8" y="8" width="4" height="16" rx="2" />
      <rect x="14" y="8" width="4" height="11" rx="2" opacity="0.85" />
      <rect x="20" y="8" width="4" height="6" rx="2" opacity="0.7" />
    </svg>
  )
}
