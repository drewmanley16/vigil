'use client';

import { useState, useEffect, useRef } from 'react';

const SEQUENCE = [
  { type: 'dim',      text: '[Monitor] Block 39,147,284 scanned' },
  { type: 'event',    text: '[Event]   TransactionProposed detected' },
  { type: 'dim',      text: '          └─ 0.0020 ETH  ·  To: 0x000…dEaD' },
  { type: 'warn',     text: '[Signals] FIRST_TIME_RECIPIENT  ·  ABOVE_THRESHOLD' },
  { type: 'warn',     text: '          ROUND_NUMBER_AMOUNT' },
  { type: 'cyan',     text: '[Venice]  Requesting private inference (no retention)…' },
  { type: 'critical', text: '[Venice]  CRITICAL  ·  Score 94/100  ·  REQUIRE_APPROVAL' },
  { type: 'cyan',     text: '[OnChain] setRiskScore(txId=7, score=94) sent' },
  { type: 'success',  text: '[OnChain] Confirmed · block 39,147,285' },
  { type: 'success',  text: '[Telegram] Alert dispatched to guardian ✓' },
  { type: 'dim',      text: '[Monitor] Block 39,147,285 scanned' },
  { type: 'dim',      text: '[Monitor] Block 39,147,286 scanned' },
  { type: 'dim',      text: '[Monitor] Block 39,147,287 scanned' },
];

const COLORS: Record<string, string> = {
  dim:      'text-slate-600',
  event:    'text-cyan-400',
  warn:     'text-yellow-400',
  critical: 'text-red-400 font-bold',
  success:  'text-emerald-400',
  cyan:     'text-cyan-300',
};

const DELAYS: Record<string, number> = {
  dim:      400,
  event:    900,
  warn:     700,
  critical: 1400,
  success:  800,
  cyan:     1000,
};

export function LiveConsole() {
  const [lines, setLines] = useState<typeof SEQUENCE>([]);
  const [cursor, setCursor] = useState(true);
  const indexRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    function addLine() {
      const i = indexRef.current;
      if (i >= SEQUENCE.length) {
        indexRef.current = 0;
        setLines([]);
        timeout = setTimeout(addLine, 2500);
        return;
      }
      const line = SEQUENCE[i];
      setLines(prev => [...prev, line]);
      indexRef.current++;
      timeout = setTimeout(addLine, DELAYS[line.type] ?? 500);
    }

    timeout = setTimeout(addLine, 600);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCursor(c => !c), 530);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-[#060c13] overflow-hidden shadow-[0_0_60px_rgba(6,182,212,0.06)]">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-cyan-950/20">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <span className="font-mono text-[11px] text-slate-600">vigil-agent · railway · production</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
          <span className="font-mono text-[10px] text-emerald-500 tracking-widest uppercase">Live</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 h-[260px] overflow-y-auto font-mono text-[12px] leading-6 space-y-px" style={{ scrollbarWidth: 'none' }}>
        {lines.map((line, i) => (
          <div key={i} className={`slide-in ${COLORS[line.type] ?? 'text-slate-400'}`}>
            {line.text}
          </div>
        ))}
        <span className={`text-cyan-400 ${cursor ? 'opacity-100' : 'opacity-0'}`}>▌</span>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
