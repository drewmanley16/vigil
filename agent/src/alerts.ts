import { AnalysisBundle, RiskLevel } from './types.js';
import { ethers } from 'ethers';

const TELEGRAM_API = 'https://api.telegram.org';

const RISK_EMOJI: Record<RiskLevel, string> = {
  LOW: '🟢',
  MEDIUM: '🟡',
  HIGH: '🟠',
  CRITICAL: '🔴',
};

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatMessage(bundle: AnalysisBundle, contractAddress: string, dashboardUrl: string): string {
  const { transaction: tx, signals, veniceResult } = bundle;
  const emoji = RISK_EMOJI[veniceResult.riskLevel];
  const valueEth = parseFloat(ethers.formatEther(tx.value)).toFixed(4);
  const triggeredSignals = signals.filter((s) => s.triggered);
  const isEscrowed = tx.txId !== undefined;
  const reasoning = escapeHtml(veniceResult.reasoning);
  const toAddr = escapeHtml(tx.to ?? 'unknown');
  const score = veniceResult.riskScore;

  // Score bar: 10 blocks
  const filled = Math.round(score / 10);
  const scoreBar = '█'.repeat(filled) + '░'.repeat(10 - filled);

  // Signal chips
  const signalMap: Record<string, string> = {
    FIRST_TIME_RECIPIENT: '👤 New recipient',
    ABOVE_THRESHOLD: '💰 Above threshold',
    UNUSUAL_HOUR: '🌙 Unusual hour',
    RAPID_SUCCESSION: '⚡ Rapid succession',
    CONTRACT_INTERACTION: '📜 Contract call',
  };
  const signalList = triggeredSignals.length
    ? triggeredSignals.map((s) => signalMap[s.signal] ?? s.signal).join('  ·  ')
    : 'None';

  const header = isEscrowed
    ? `🔒 <b>FUNDS HELD IN ESCROW</b>`
    : `${emoji} <b>VIGIL ALERT</b>`;

  const lines = [
    header,
    `<code>──────────────────────</code>`,
    ``,
    `${emoji} <b>${veniceResult.riskLevel} RISK</b>  ·  Score <b>${score}/100</b>`,
    `<code>${scoreBar}</code>`,
    ``,
    `<b>Amount</b>   <code>${valueEth} ETH</code>`,
    `<b>To</b>       <code>${toAddr}</code>`,
    isEscrowed ? `<b>Tx ID</b>    <code>#${tx.txId}</code>` : '',
    ``,
    `<b>Venice AI:</b>`,
    `<i>${reasoning}</i>`,
    ``,
    `<b>Signals:</b>  ${signalList}`,
    ``,
    `<code>──────────────────────</code>`,
    isEscrowed
      ? `⚠️ <b>Action required.</b> Open the dashboard to approve or cancel.\n\n<a href="${dashboardUrl}">→ Open Guardian Console</a>`
      : `<a href="${dashboardUrl}">→ Open Guardian Console</a>`,
  ];

  return lines.filter((l) => l !== '').join('\n');
}

export async function sendTelegramAlert(
  bundle: AnalysisBundle,
  botToken: string,
  chatId: string,
  contractAddress: string,
  dashboardUrl: string = 'https://vigil-guardian.vercel.app/dashboard'
): Promise<void> {
  const message = formatMessage(bundle, contractAddress, dashboardUrl);

  const url = `${TELEGRAM_API}/bot${botToken}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Telegram error ${response.status}: ${err}`);
    }

    console.log(`[Telegram] Alert sent for ${veniceResult_level(bundle)} risk transaction`);
  } catch (err) {
    console.error('[Telegram] Failed to send alert:', err);
  }
}

function veniceResult_level(bundle: AnalysisBundle): string {
  return bundle.veniceResult.riskLevel;
}
