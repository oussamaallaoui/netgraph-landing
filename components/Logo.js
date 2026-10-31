// The NetGraph mark: three violet nodes joined by edges (design system › Logos).
export default function Logo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true" focusable="false">
      <circle cx="11" cy="6" r="3" fill="#4B3FCC" />
      <circle cx="4" cy="17" r="3" fill="#4B3FCC" opacity=".6" />
      <circle cx="18" cy="17" r="3" fill="#4B3FCC" opacity=".6" />
      <line x1="11" y1="9" x2="4" y2="14" stroke="#4B3FCC" strokeWidth="1.5" opacity=".5" />
      <line x1="11" y1="9" x2="18" y2="14" stroke="#4B3FCC" strokeWidth="1.5" opacity=".5" />
      <line x1="4" y1="17" x2="18" y2="17" stroke="#4B3FCC" strokeWidth="1.5" opacity=".3" />
    </svg>
  )
}
