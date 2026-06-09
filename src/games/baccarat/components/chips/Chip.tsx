interface ChipProps {
  value: number;
  size?: number;
  selected?: boolean;
  onClick?: () => void;
  animate?: boolean;
}

// Chip face colors by denomination (classic casino conventions, brass-accented).
function chipColor(value: number): { base: string; edge: string } {
  if (value >= 1000) return { base: '#3a2a4a', edge: '#C9A24B' };
  if (value >= 500) return { base: '#5a1f1f', edge: '#e8d9a8' };
  if (value >= 100) return { base: '#1a1a1a', edge: '#C9A24B' };
  if (value >= 25) return { base: '#1d5e3a', edge: '#e8d9a8' };
  if (value >= 5) return { base: '#7a1f24', edge: '#f0e6cf' };
  return { base: '#2a3340', edge: '#cdd6e0' };
}

export function Chip({ value, size = 50, selected, onClick, animate }: ChipProps) {
  const { base, edge } = chipColor(value);
  const label = value >= 1000 ? `${value / 1000}K` : `${value}`;
  return (
    <button
      onClick={onClick}
      className={`relative shrink-0 rounded-full transition-transform ${onClick ? 'hover:-translate-y-1' : ''} ${
        animate ? 'animate-chipFly' : ''
      } ${selected ? '-translate-y-1.5' : ''}`}
      style={{ width: size, height: size }}
      type="button"
      aria-label={`${value} chip`}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${base} 0%, ${base} 55%, rgba(0,0,0,0.5) 100%)`,
          boxShadow: selected
            ? `0 0 0 3px ${edge}, 0 4px 10px rgba(0,0,0,0.6)`
            : '0 3px 8px rgba(0,0,0,0.5)',
          border: `2px dashed ${edge}`,
        }}
      />
      <span
        className="tnum absolute inset-0 flex items-center justify-center font-bold text-white"
        style={{ fontSize: size * 0.28, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
      >
        {label}
      </span>
    </button>
  );
}
