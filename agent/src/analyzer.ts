import { Transaction, SignalResult, VeniceAnalysisResult } from './types.js';
import { ethers } from 'ethers';

const VENICE_API_BASE = 'https://api.venice.ai/api/v1';
const MODEL = 'llama-3.3-70b';

function buildPrompt(
  tx: Transaction,
  signals: SignalResult[],
  compositeScore: number
): string {
  const triggeredSignals = signals.filter((s) => s.triggered).map((s) => s.signal);
  const valueEth = parseFloat(ethers.formatEther(tx.value)).toFixed(4);
  const recipientType = tx.isContractInteraction ? 'smart contract' : 'external wallet';

  return `You are Vigil, a financial safety AI protecting an elderly crypto user from fraud.

Analyze this transaction and return a JSON risk assessment.

Transaction Summary:
- Value: ${valueEth} ETH
- Recipient type: ${recipientType}
- First time sending to this address: ${tx.isFirstTimeRecipient}
- Signals detected: ${triggeredSignals.length > 0 ? triggeredSignals.join(', ') : 'none'}
- Composite risk score (0-100): ${compositeScore}

Risk signals explanation:
- FIRST_TIME_RECIPIENT: owner has never sent to this address before
- ABOVE_THRESHOLD: exceeds the guardian-defined safety threshold
- UNUSUAL_HOUR: initiated between 2am-6am UTC (common for scam pressure tactics)
- RAPID_SUCCESSION: multiple transactions in a short period (possible coercion)
- CONTRACT_INTERACTION: sending to a smart contract, not a regular wallet

Respond ONLY with valid JSON in this exact format:
{
  "riskScore": <integer 0-100>,
  "riskLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "reasoning": "<1-2 sentence plain English explanation for guardians>",
  "recommendedAction": "<ALLOW|ALERT_GUARDIAN|REQUIRE_APPROVAL>",
  "confidence": <float 0.0-1.0>
}

Rules:
- riskScore 0-29 → LOW, ALLOW
- riskScore 30-59 → MEDIUM, ALERT_GUARDIAN
- riskScore 60-79 → HIGH, ALERT_GUARDIAN
- riskScore 80-100 → CRITICAL, REQUIRE_APPROVAL
- Be conservative. False positives protect the user. False negatives can mean financial ruin.`;
}

export async function analyzeWithVenice(
  tx: Transaction,
  signals: SignalResult[],
  compositeScore: number,
  apiKey: string
): Promise<VeniceAnalysisResult> {
  const prompt = buildPrompt(tx, signals, compositeScore);

  try {
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
        max_tokens: 300,
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
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';

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
    console.error('[Venice] Analysis failed, defaulting to HIGH risk:', err);
    // Conservative fallback
    return {
      riskScore: 75,
      riskLevel: 'HIGH',
      reasoning: 'Venice analysis unavailable. Defaulting to HIGH risk as a precaution.',
      recommendedAction: 'ALERT_GUARDIAN',
      confidence: 0.5,
    };
  }
}
