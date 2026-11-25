export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Unthink AI brass fulcrum mark"
    >
      <rect width="40" height="40" rx="10" fill="#161A23" stroke="#2B3240" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="11" stroke="#E8B84B" strokeWidth="1.5" strokeDasharray="3 2.5" opacity="0.65" />
      <path d="M12 22.5L28 17.5" stroke="#F2F4F8" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="13.5" cy="22" r="2.2" fill="#98A2B3" />
      <circle cx="26.5" cy="18" r="2.8" fill="#E8B84B" />
      <path d="M16.5 29L20 22.5L23.5 29H16.5Z" fill="#E8B84B" />
    </svg>
  );
}
