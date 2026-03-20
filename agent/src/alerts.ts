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

function formatMessage(bundle: AnalysisBundle, dashboardUrl: string): string {
  const { transaction: tx, signals, veniceResult } = bundle;
  const emoji = RISK_EMOJI[veniceResult.riskLevel];
  const valueEth = parseFloat(ethers.formatEther(tx.value)).toFixed(4);
  const triggeredSignals = signals.filter((s) => s.triggered);
  const isEscrowed = tx.txId !== undefined;
  const reasoning = escapeHtml(veniceResult.reasoning);
  const toAddr = escapeHtml(tx.to ?? 'unknown');
  const score = veniceResult.riskScore;

  const filled = Math.round(score / 10);
  const scoreBar = '█'.repeat(filled) + '░'.repeat(10 - filled);

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

  const header = isEscrowed ? `🔒 <b>FUNDS HELD IN ESCROW</b>` : `${emoji} <b>VIGIL ALERT</b>`;

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
      ? `⚠️ <b>Action required.</b> Use the buttons below or open the dashboard.`
      : `<a href="${dashboardUrl}">→ Open Guardian Console</a>`,
  ];

  return lines.filter((l) => l !== '').join('\n');
}

function buildReplyMarkup(bundle: AnalysisBundle, dashboardUrl: string) {
  const isEscrowed = bundle.transaction.txId !== undefined;
  if (!isEscrowed) return undefined;

  return {
    inline_keyboard: [
      [
        { text: '✓ Approve', callback_data: `approve:${bundle.transaction.txId}` },
        { text: '✗ Cancel', callback_data: `cancel:${bundle.transaction.txId}` },
      ],
      [
        { text: '→ Open Dashboard', url: dashboardUrl },
      ],
    ],
  };
}

export async function sendTelegramAlert(
  bundle: AnalysisBundle,
  botToken: string,
  chatId: string,
  contractAddress: string,
  dashboardUrl: string = 'https://vigil-guardian.vercel.app/dashboard'
): Promise<void> {
  const message = formatMessage(bundle, dashboardUrl);
  const replyMarkup = buildReplyMarkup(bundle, dashboardUrl);

  const url = `${TELEGRAM_API}/bot${botToken}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

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
    console.log(`[Telegram] Alert sent — ${bundle.veniceResult.riskLevel} risk`);
  } catch (err) {
    console.error('[Telegram] Failed to send alert:', err);
  }
}

async function answerCallbackQuery(botToken: string, callbackQueryId: string, text: string): Promise<void> {
  await fetch(`${TELEGRAM_API}/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
  });
}

export async function startTelegramCallbackHandler(
  botToken: string,
  contract: ethers.Contract
): Promise<void> {
  let offset = 0;
  console.log('[Telegram] Callback handler started');

  const poll = async () => {
    try {
      const res = await fetch(`${TELEGRAM_API}/bot${botToken}/getUpdates?offset=${offset}&timeout=10&allowed_updates=["callback_query"]`);
      if (!res.ok) return;
      const data = await res.json() as any;

      for (const update of data.result ?? []) {
        offset = update.update_id + 1;
        const cq = update.callback_query;
        if (!cq?.data) continue;

        const [action, txIdStr] = cq.data.split(':');
        const txId = parseInt(txIdStr, 10);
        if (isNaN(txId)) continue;

        console.log(`[Telegram] Callback: ${action} txId=${txId}`);

        try {
          if (action === 'approve') {
            const tx = await contract.approve(txId);
            await tx.wait();
            await answerCallbackQuery(botToken, cq.id, `✓ Tx #${txId} approved — funds released.`);
            console.log(`[Telegram] Approved txId=${txId}`);
          } else if (action === 'cancel') {
            const tx = await contract.cancel(txId);
            await tx.wait();
            await answerCallbackQuery(botToken, cq.id, `✗ Tx #${txId} cancelled — funds returned.`);
            console.log(`[Telegram] Cancelled txId=${txId}`);
          }
        } catch (err: any) {
          await answerCallbackQuery(botToken, cq.id, `Error: ${err.message?.slice(0, 80)}`);
          console.error(`[Telegram] Callback action failed:`, err);
        }
      }
    } catch (err) {
      console.error('[Telegram] Callback poll error:', err);
    }
  };

  setInterval(poll, 3000);
}
