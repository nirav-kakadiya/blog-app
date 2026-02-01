'use client';

import { getScoreColor } from '@/lib/score-utils';

interface ScoreRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  subtitle?: string;
  colorFn?: (score: number) => string;
}

const SIZES = {
  sm: { wh: 64, r: 24, sw: 4, fontSize: 'text-lg', subSize: 'text-[9px]' },
  md: { wh: 80, r: 28, sw: 5, fontSize: 'text-xl', subSize: 'text-[10px]' },
  lg: { wh: 96, r: 34, sw: 6, fontSize: 'text-2xl', subSize: 'text-xs' },
};

export function ScoreRing({ score, size = 'md', label, subtitle, colorFn }: ScoreRingProps) {
  const cfg = SIZES[size];
  const circumference = 2 * Math.PI * cfg.r;
  const offset = circumference - (score / 100) * circumference;
  const color = colorFn ? colorFn(score) : getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: cfg.wh, height: cfg.wh }}>
        <svg width={cfg.wh} height={cfg.wh} className="-rotate-90">
          <circle
            cx={cfg.wh / 2}
            cy={cfg.wh / 2}
            r={cfg.r}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={cfg.sw}
          />
          <circle
            cx={cfg.wh / 2}
            cy={cfg.wh / 2}
            r={cfg.r}
            fill="none"
            stroke={color}
            strokeWidth={cfg.sw}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${cfg.fontSize} font-bold`} style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      {label && <span className="text-xs font-medium text-gray-600">{label}</span>}
      {subtitle && <span className={`${cfg.subSize} text-gray-400`}>{subtitle}</span>}
    </div>
  );
}
