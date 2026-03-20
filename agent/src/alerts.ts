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
  const triggeredSignals = signals.filter((s) => s.triggered).map((s) => `• ${s.signal}`).join('\n');
  const isEscrowed = tx.txId !== undefined;
  const reasoning = escapeHtml(veniceResult.reasoning);
  const toAddr = escapeHtml(truncateAddress(tx.to ?? 'unknown'));

  const lines = [
    `${emoji} <b>VIGIL ALERT — ${veniceResult.riskLevel} RISK</b>`,
    ``,
    `💸 <b>Amount:</b> ${valueEth} ETH`,
    `📬 <b>To:</b> <code>${toAddr}</code>`,
    `🤖 <b>Venice AI Score:</b> ${veniceResult.riskScore}/100`,
    `📋 <b>Assessment:</b> ${reasoning}`,
    ``,
    `<b>Signals:</b>`,
    triggeredSignals || '• None',
    ``,
    isEscrowed
      ? `🔒 <b>Status:</b> ESCROWED — guardian action required (Tx #${tx.txId})`
      : `⚡ <b>Status:</b> Direct transfer (already sent)`,
    ``,
    `🔗 <a href="${dashboardUrl}">View Dashboard</a>`,
    isEscrowed ? `\n⚠️ Open the dashboard to <b>Approve</b> or <b>Cancel</b> this transaction.` : '',
  ];

  return lines.filter((l) => l !== '').join('\n');
}

export async function sendTelegramAlert(
  bundle: AnalysisBundle,
  botToken: string,
  chatId: string,
  contractAddress: string,
  dashboardUrl: string = 'https://vigil.vercel.app/dashboard'
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
