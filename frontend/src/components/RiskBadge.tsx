type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const styles: Record<RiskLevel, string> = {
  LOW:      'bg-emerald-950/50 text-emerald-400 border-emerald-500/30',
  MEDIUM:   'bg-yellow-950/50 text-yellow-400 border-yellow-500/30',
  HIGH:     'bg-orange-950/50 text-orange-400 border-orange-500/30',
  CRITICAL: 'bg-red-950/50 text-red-400 border-red-500/50 critical-flicker',
};

const dots: Record<RiskLevel, string> = {
  LOW:      'bg-emerald-400',
  MEDIUM:   'bg-yellow-400',
  HIGH:     'bg-orange-400',
  CRITICAL: 'bg-red-400',
};

export function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold tracking-widest uppercase ${styles[level]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[level]}`} />
      {level}{score !== undefined ? ` · ${score}` : ''}
    </span>
  );
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}
