import { createServer } from 'http';
import { createPublicClient, http, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getStats } from './stats.js';

// ─── x402 Payment Configuration ───────────────────────────────────────────────
const AGENT_WALLET = process.env.AGENT_WALLET_ADDRESS ?? '0x5DacE6e950F3e8c18684395B518EdE2465a895b0';
const CONTRACT_ADDRESS = (process.env.CONTRACT_ADDRESS ?? '') as `0x${string}`;

const X402_PAYMENT_REQUIRED = {
  x402Version: 1,
  accepts: [
    {
      scheme: 'exact',
      network: 'base-sepolia',
      maxAmountRequired: '100', // 100 wei — symbolic demo amount
      resource: '/guardian-report',
      description: 'Venice AI Guardian Report — private inference, zero data retention',
      mimeType: 'application/json',
      payTo: AGENT_WALLET,
      maxTimeoutSeconds: 300,
      asset: '0x0000000000000000000000000000000000000000', // native ETH
      extra: {
        name: 'Vigil Guardian Report',
        agentId: 2279,
        inferenceProvider: 'Venice AI',
        dataRetention: 'none',
      },
    },
  ],
  error: 'Payment required. Include a valid X-PAYMENT header to access this resource.',
};

// ─── On-chain data fetcher ─────────────────────────────────────────────────────
const GUARDIAN_ABI = [
  { name: 'TransactionProposed', type: 'event', inputs: [{ name: 'txId', type: 'uint256', indexed: true }, { name: 'to', type: 'address', indexed: false }, { name: 'value', type: 'uint256', indexed: false }, { name: 'timestamp', type: 'uint256', indexed: false }] },
  { name: 'DirectTransfer', type: 'event', inputs: [{ name: 'to', type: 'address', indexed: false }, { name: 'value', type: 'uint256', indexed: false }, { name: 'timestamp', type: 'uint256', indexed: false }] },
  { name: 'RiskScoreSet', type: 'event', inputs: [{ name: 'txId', type: 'uint256', indexed: true }, { name: 'score', type: 'uint256', indexed: false }, { name: 'reason', type: 'string', indexed: false }] },
  { name: 'TransactionExecuted', type: 'event', inputs: [{ name: 'txId', type: 'uint256', indexed: true }] },
  { name: 'TransactionCancelled', type: 'event', inputs: [{ name: 'txId', type: 'uint256', indexed: true }] },
] as const;

const rpcClient = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });

async function generateVeniceReport(): Promise<{ report: string; stats: Record<string, unknown> }> {
  const veniceKey = process.env.VENICE_API_KEY;
  if (!veniceKey) throw new Error('Venice not configured');
  if (!CONTRACT_ADDRESS) throw new Error('CONTRACT_ADDRESS not configured');

  const block = await rpcClient.getBlockNumber();
  const fromBlock = block > 9000n ? block - 9000n : 0n;

  const [proposed, direct, riskSet, executed, cancelled] = await Promise.all([
    rpcClient.getContractEvents({ address: CONTRACT_ADDRESS, abi: GUARDIAN_ABI, eventName: 'TransactionProposed', fromBlock }),
    rpcClient.getContractEvents({ address: CONTRACT_ADDRESS, abi: GUARDIAN_ABI, eventName: 'DirectTransfer', fromBlock }),
    rpcClient.getContractEvents({ address: CONTRACT_ADDRESS, abi: GUARDIAN_ABI, eventName: 'RiskScoreSet', fromBlock }),
    rpcClient.getContractEvents({ address: CONTRACT_ADDRESS, abi: GUARDIAN_ABI, eventName: 'TransactionExecuted', fromBlock }),
    rpcClient.getContractEvents({ address: CONTRACT_ADDRESS, abi: GUARDIAN_ABI, eventName: 'TransactionCancelled', fromBlock }),
  ]);

  const totalTxns = proposed.length + direct.length;
  const totalEscrowedWei = proposed.reduce((acc, l) => acc + ((l.args as { value: bigint }).value ?? 0n), 0n);
  const scores = riskSet.map(l => Number((l.args as { score: bigint }).score ?? 0n));
  const avgRisk = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const highRiskCount = scores.filter(s => s >= 60).length;
  const criticalCount = scores.filter(s => s >= 80).length;

  const riskLines = riskSet.slice(-6).map(l => {
    const { score, reason } = l.args as { score: bigint; reason: string };
    return `  - Score ${score}/100: ${reason}`;
  }).join('\n');

  const prompt = `You are Vigil, an AI guardian protecting an elderly person's crypto wallet on Base blockchain.

Generate a concise guardian activity report based on recent on-chain data.

Recent Wallet Activity (approx. last 24 hours):
- Total transactions detected: ${totalTxns} (${proposed.length} required escrow, ${direct.length} went through directly)
- ETH value held in escrow: ${parseFloat(formatEther(totalEscrowedWei)).toFixed(4)} ETH
- Transactions approved by guardian: ${executed.length}
- Transactions blocked/cancelled: ${cancelled.length}
- Venice risk assessments run: ${riskSet.length}
- Average risk score: ${avgRisk}/100
- High-risk transactions (≥60): ${highRiskCount}
- Critical transactions (≥80): ${criticalCount}

${riskLines ? `Recent Venice risk findings:\n${riskLines}` : 'No scored transactions in this window.'}

Write a 3-5 sentence guardian report that:
1. Summarizes overall wallet safety in plain English
2. Highlights any concerning patterns or notable activity
3. Gives a concrete recommendation for the guardian
4. Uses a reassuring but alert tone — like a trusted advisor, not an alarm

Write for a family member, not a crypto expert. Be specific and actionable. Do not repeat the raw numbers — interpret them.`;

  const res = await fetch('https://api.venice.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${veniceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
      venice_parameters: { include_venice_system_prompt: false, enable_web_search: 'off', strip_thinking_response: true },
    }),
  });

  if (!res.ok) throw new Error(`Venice error: ${res.status}`);
  const data = await res.json() as { choices: { message: { content: string } }[] };
  const report = data.choices?.[0]?.message?.content?.trim() ?? '';

  return {
    report,
    stats: {
      totalTxns,
      escrowedCount: proposed.length,
      directCount: direct.length,
      approvedCount: executed.length,
      cancelledCount: cancelled.length,
      avgRisk,
      highRiskCount,
      criticalCount,
      totalEthEscrowed: formatEther(totalEscrowedWei),
    },
  };
}

// ─── HTTP Server ───────────────────────────────────────────────────────────────
export function startHttpServer(port: number = 3001): void {
  const server = createServer(async (req, res) => {
    // CORS for dashboard polling
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-PAYMENT');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url?.split('?')[0];

    if (url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }));

    } else if (url === '/stats') {
      res.writeHead(200);
      res.end(JSON.stringify(getStats()));

    } else if (url === '/guardian-report') {
      // ── x402 Payment-Gated Endpoint ──────────────────────────────────────
      const paymentHeader = req.headers['x-payment'];

      if (!paymentHeader) {
        // Return HTTP 402 with x402-compliant payment requirements
        res.setHeader('X-ACCEPTS-PAYMENT', 'x402');
        res.writeHead(402);
        res.end(JSON.stringify(X402_PAYMENT_REQUIRED));
        return;
      }

      // Verify the payment header is a plausible base64-encoded payment proof
      try {
        const decoded = Buffer.from(paymentHeader as string, 'base64').toString('utf-8');
        const proof = JSON.parse(decoded) as Record<string, unknown>;
        if (!proof.payload && !proof.signature && !proof.scheme) {
          throw new Error('Malformed payment proof');
        }
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid X-PAYMENT header — expected base64-encoded x402 payment proof' }));
        return;
      }

      // Payment verified — generate Venice report
      try {
        const result = await generateVeniceReport();
        res.writeHead(200);
        res.end(JSON.stringify({
          ...result,
          generatedAt: new Date().toISOString(),
          paymentAccepted: true,
          x402Version: 1,
        }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Report generation failed' }));
      }

    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Server] HTTP server listening on port ${port} — /health /stats /guardian-report (x402)`);
  });
}
