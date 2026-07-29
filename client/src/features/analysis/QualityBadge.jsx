import React from 'react';

/**
 * QualityBadge â€” Codecov-style embeddable quality score badge.
 * Shows a color-coded score (0-100) with grade letter.
 */
export default function QualityBadge({ score = 0, size = 'md', showGrade = true }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  const grade =
    clamped >= 90 ? 'A' :
    clamped >= 80 ? 'B' :
    clamped >= 70 ? 'C' :
    clamped >= 60 ? 'D' : 'F';

  const color =
    clamped >= 90 ? '#22c55e' :
    clamped >= 80 ? '#84cc16' :
    clamped >= 70 ? '#eab308' :
    clamped >= 60 ? '#f97316' : '#ef4444';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizeClasses[size] || sizeClasses.md}`}
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
      title={`Quality Score: ${clamped}/100 (Grade ${grade})`}
    >
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{clamped}</span>
      {showGrade && (
        <span className="opacity-75 text-[0.8em]">({grade})</span>
      )}
    </span>
  );
}

