import { Transaction, SignalResult, VeniceAnalysisResult } from './types.js';
import { ethers } from 'ethers';
import { stats } from './stats.js';

const VENICE_API_BASE = 'https://api.venice.ai/api/v1';
const MODEL = 'llama-3.3-70b';

export interface RecentTxSummary {
  valueEth: string;
  isFirstTime: boolean;
  riskScore: number;
  riskLevel: string;
  triggeredSignals: string[];
  minutesAgo: number;
}

function buildPrompt(
  tx: Transaction,
  signals: SignalResult[],
  compositeScore: number,
  recentHistory: RecentTxSummary[]
): string {
  const triggeredSignals = signals.filter((s) => s.triggered).map((s) => s.signal);
  const valueEth = parseFloat(ethers.formatEther(tx.value)).toFixed(4);
  const recipientType = tx.isContractInteraction ? 'smart contract' : 'external wallet';

  const historySection =
    recentHistory.length > 0
      ? `\nSession History (last ${recentHistory.length} transaction(s) in past 30 minutes):
${recentHistory
  .map(
    (h) =>
      `  - ${h.valueEth} ETH to ${h.isFirstTime ? 'new' : 'known'} address, ${h.minutesAgo}m ago — ${h.riskLevel} risk (score ${h.riskScore}), signals: [${h.triggeredSignals.join(', ') || 'none'}]`
  )
  .join('\n')}`
      : '';

  return `You are Vigil, a financial safety AI protecting an elderly crypto user from fraud.

Analyze this transaction and return a JSON risk assessment.

Current Transaction:
- Value: ${valueEth} ETH
- Recipient type: ${recipientType}
- First time sending to this address: ${tx.isFirstTimeRecipient}
- Escrowed (above guardian threshold): ${tx.txId !== undefined}
- Signals detected: ${triggeredSignals.length > 0 ? triggeredSignals.join(', ') : 'none'}
- Composite risk score (0-100): ${compositeScore}${historySection}

Signal definitions:
- FIRST_TIME_RECIPIENT: owner has never sent to this address before
- ABOVE_THRESHOLD: exceeds the guardian-defined safety threshold (funds are escrowed)
- UNUSUAL_HOUR: initiated between 2am-6am UTC (common for scam pressure tactics)
- RAPID_SUCCESSION: multiple transactions in a short period (possible coercion or confusion)
- CONTRACT_INTERACTION: sending to a smart contract, not a regular wallet
- ROUND_NUMBER_AMOUNT: suspiciously round ETH amount, common in social engineering scripts

Respond ONLY with valid JSON in this exact format:
{
  "riskScore": <integer 0-100>,
  "riskLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "reasoning": "<1-2 sentence plain English explanation for family guardians — be specific about why this is suspicious>",
  "recommendedAction": "<ALLOW|ALERT_GUARDIAN|REQUIRE_APPROVAL>",
  "confidence": <float 0.0-1.0>
}

Rules:
- riskScore 0-29 → LOW, ALLOW
- riskScore 30-59 → MEDIUM, ALERT_GUARDIAN
- riskScore 60-79 → HIGH, ALERT_GUARDIAN
- riskScore 80-100 → CRITICAL, REQUIRE_APPROVAL
- If session history shows a pattern of suspicious transactions, increase risk accordingly
- Be conservative. False positives protect a vulnerable person. False negatives can mean financial ruin.
- Write the reasoning as if explaining to a worried family member, not a crypto expert.`;
}

async function callVenice(prompt: string, apiKey: string): Promise<string> {
  stats.veniceCallsMade++;

  const response = await fetch(`${VENICE_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 400,
      venice_parameters: {
        include_venice_system_prompt: false,
        enable_web_search: 'off',
        strip_thinking_response: true,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Venice API error ${response.status}: ${err}`);
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

export async function analyzeWithVenice(
  tx: Transaction,
  signals: SignalResult[],
  compositeScore: number,
  apiKey: string,
  recentHistory: RecentTxSummary[] = []
): Promise<VeniceAnalysisResult> {
  const prompt = buildPrompt(tx, signals, compositeScore, recentHistory);

  try {
    const content = await callVenice(prompt, apiKey);

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Venice response');

    const parsed = JSON.parse(jsonMatch[0]) as VeniceAnalysisResult;

    // Validate required fields
    if (
      typeof parsed.riskScore !== 'number' ||
      !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parsed.riskLevel) ||
      !['ALLOW', 'ALERT_GUARDIAN', 'REQUIRE_APPROVAL'].includes(parsed.recommendedAction)
    ) {
      throw new Error('Invalid Venice response structure');
    }

    console.log(`[Venice] riskLevel=${parsed.riskLevel} score=${parsed.riskScore} action=${parsed.recommendedAction}`);
    return parsed;
  } catch (err) {
    stats.veniceCallsFailed++;
    console.error('[Venice] Analysis failed, defaulting to HIGH risk:', err);
    // Conservative fallback — protect the user
    return {
      riskScore: 75,
      riskLevel: 'HIGH',
      reasoning: 'Automated analysis temporarily unavailable. This transaction has been flagged for manual guardian review as a precaution.',
      recommendedAction: 'ALERT_GUARDIAN',
      confidence: 0.5,
    };
  }
}

// Build a behavioral pattern summary for the Telegram alert when multiple
// transactions are detected in a short session.
export async function analyzeSessionPattern(
  history: RecentTxSummary[],
  apiKey: string
): Promise<string | null> {
  if (history.length < 2) return null;

  const prompt = `You are Vigil, a financial safety AI protecting an elderly crypto user.

You have detected ${history.length} transactions in the last 30 minutes from the same wallet. Analyze the session pattern and write a 1-2 sentence alert summary for the family guardian.

Session transactions:
${history
  .map(
    (h, i) =>
      `  ${i + 1}. ${h.valueEth} ETH to ${h.isFirstTime ? 'new (never-seen)' : 'known'} address — ${h.riskLevel} risk, ${h.minutesAgo}m ago`
  )
  .join('\n')}

Write ONLY a plain-English 1-2 sentence pattern summary. No JSON. Focus on what's alarming about the session as a whole.`;

  try {
    stats.veniceCallsMade++;
    const content = await callVenice(prompt, apiKey);
    return content.slice(0, 300);
  } catch (err) {
    console.error('[Venice] Pattern analysis failed:', err);
    stats.veniceCallsFailed++;
    return null;
  }
}
