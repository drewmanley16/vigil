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

function formatMessage(bundle: AnalysisBundle, contractAddress: string, dashboardUrl: string): string {
  const { transaction: tx, signals, veniceResult, compositeScore } = bundle;
  const emoji = RISK_EMOJI[veniceResult.riskLevel];
  const valueEth = parseFloat(ethers.formatEther(tx.value)).toFixed(4);
  const triggeredSignals = signals.filter((s) => s.triggered).map((s) => `• ${s.signal}: ${s.description}`).join('\n');
  const isEscrowed = tx.txId !== undefined;

  const lines = [
    `${emoji} *VIGIL ALERT — ${veniceResult.riskLevel} RISK*`,
    ``,
    `💸 *Amount:* ${valueEth} ETH`,
    `📬 *To:* \`${truncateAddress(tx.to ?? 'unknown')}\``,
    `🤖 *Venice AI Score:* ${veniceResult.riskScore}/100`,
    `📋 *Assessment:* ${veniceResult.reasoning}`,
    ``,
    `*Signals Detected:*`,
    triggeredSignals || '• None',
    ``,
    isEscrowed
      ? `🔒 *Status:* ESCROWED — guardian action required (Tx #${tx.txId})`
      : `⚡ *Status:* Direct transfer (already sent)`,
    ``,
    `🔗 [View Dashboard](${dashboardUrl})`,
    isEscrowed ? `\n⚠️ Open the dashboard to *Approve* or *Cancel* this transaction.` : '',
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
    parse_mode: 'Markdown',
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
