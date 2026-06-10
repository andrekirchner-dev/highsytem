export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-xl';
  return (
    <div className={`flex items-center gap-2 font-display font-bold ${textSize}`}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="14" width="24" height="12" rx="2" fill="#161D16" stroke="#2A352A" strokeWidth="1.5"/>
        <rect x="6" y="17" width="4" height="3" rx="0.5" fill="#8BE04E" opacity="0.8"/>
        <rect x="12" y="17" width="4" height="3" rx="0.5" fill="#8BE04E" opacity="0.5"/>
        <rect x="18" y="17" width="4" height="3" rx="0.5" fill="#8BE04E" opacity="0.3"/>
        <path d="M8 14V8C8 6.5 9 5 11 4L14 2L17 4C19 5 20 6.5 20 8V14" stroke="#8BE04E" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="14" cy="8" r="2.5" fill="#8BE04E" opacity="0.9"/>
      </svg>
      <span>
        <span style={{ color: '#8BE04E' }}>HIGH</span>
        <span style={{ color: '#ECEFE6' }}>SYSTEM</span>
      </span>
    </div>
  );
}
