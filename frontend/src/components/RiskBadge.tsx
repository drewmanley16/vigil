type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const cfg: Record<RiskLevel, { pill: string; dot: string; label: string }> = {
  LOW:      { pill: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-400',                    label: 'Low' },
  MEDIUM:   { pill: 'bg-yellow-950/60  text-yellow-400  border-yellow-500/25',  dot: 'bg-yellow-400',                    label: 'Medium' },
  HIGH:     { pill: 'bg-orange-950/60  text-orange-400  border-orange-500/25',  dot: 'bg-orange-400',                    label: 'High' },
  CRITICAL: { pill: 'bg-red-950/60     text-red-400     border-red-500/30 critical-flash', dot: 'bg-red-400 pulse-dot', label: 'Critical' },
};

export function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  const c = cfg[level];
  return (
    <span className={`inline-flex items-center gap-1.5 pl-2 pr-2.5 py-0.5 rounded-full border font-display text-[11px] font-semibold ${c.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {c.label}{score !== undefined ? ` · ${score}` : ''}
    </span>
  );
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}
