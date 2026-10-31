// « Contacts d'exemple (fictifs) »: shown wherever sample data is on screen.
export default function SampleBadge({ className = '' }) {
  return (
    <p className={`inline-flex items-center gap-2 rounded-full bg-violet-light px-3 py-1.5 text-xs font-medium text-violet ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-violet" aria-hidden="true" />
      Contacts d&apos;exemple (fictifs)
    </p>
  )
}
