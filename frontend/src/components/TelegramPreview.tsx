export function TelegramPreview() {
  const score = 94;
  const filled = Math.round(score / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

  return (
    <div className="rounded-2xl border border-white/8 bg-[#17212b] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
      {/* Telegram-style header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#212d3b]">
        <div className="w-9 h-9 rounded-full bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-base shrink-0">
          🛡️
        </div>
        <div>
          <p className="font-display text-sm font-bold text-white leading-none mb-0.5">Vigil Guardian</p>
          <p className="font-mono text-[10px] text-slate-500">bot · Base Sepolia</p>
        </div>
        <div className="ml-auto">
          <span className="font-mono text-[10px] text-slate-600">01:33:26</span>
        </div>
      </div>

      {/* Message bubble */}
      <div className="p-4">
        <div className="rounded-xl bg-[#212d3b] p-4 font-mono text-[12px] leading-relaxed space-y-2 mb-3">
          <p className="text-white font-bold">🔒 FUNDS HELD IN ESCROW</p>
          <p className="text-slate-600 text-[11px]">──────────────────────</p>

          <div className="space-y-0.5">
            <p className="text-red-400 font-bold">🔴 CRITICAL RISK  ·  Score 94/100</p>
            <p className="text-red-400/70 tracking-wider text-[11px]">{bar}</p>
          </div>

          <div className="space-y-0.5 pt-1">
            <p><span className="text-slate-500 inline-block w-14">Amount</span><span className="text-white font-bold">0.0020 ETH</span></p>
            <p><span className="text-slate-500 inline-block w-14">To</span><span className="text-slate-300">0x000…dEaD</span></p>
            <p><span className="text-slate-500 inline-block w-14">Tx ID</span><span className="text-slate-300">#7</span></p>
          </div>

          <div className="pt-2 border-t border-white/5 space-y-1">
            <p className="text-slate-500 text-[11px]">Venice AI:</p>
            <p className="text-slate-300 italic leading-relaxed text-[11px]">
              This transaction sends ETH to a newly-seen address using a round amount — consistent with social engineering scripts. Guardian approval required before funds are released.
            </p>
          </div>

          <div className="pt-1 border-t border-white/5">
            <p className="text-slate-500 text-[11px]">Signals: 👤 New recipient  ·  💰 Above threshold  ·  ⚡ Round amount</p>
          </div>
        </div>

        {/* Inline keyboard */}
        <div className="grid grid-cols-2 gap-2">
          <button className="rounded-lg bg-emerald-500/12 border border-emerald-500/25 py-2.5 font-display text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-default">
            ✓ Approve
          </button>
          <button className="rounded-lg bg-red-500/12 border border-red-500/25 py-2.5 font-display text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors cursor-default">
            ✗ Cancel
          </button>
        </div>
        <p className="font-mono text-[10px] text-slate-700 text-center mt-2">→ Open Guardian Console</p>
      </div>
    </div>
  );
}
