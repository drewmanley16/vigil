import { NextResponse } from 'next/server';
import { createPublicClient, http, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { GUARDIAN_WALLET_ABI } from '@/lib/contract';

const client = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });

export async function POST(req: Request) {
  const { contractAddress } = await req.json() as { contractAddress: `0x${string}` };

  if (!contractAddress) {
    return NextResponse.json({ error: 'contractAddress required' }, { status: 400 });
  }

  const veniceKey = process.env.VENICE_API_KEY;
  if (!veniceKey) {
    return NextResponse.json({ error: 'Venice not configured on server' }, { status: 500 });
  }

  // Fetch recent on-chain activity
  const block = await client.getBlockNumber();
  const fromBlock = block > 9000n ? block - 9000n : 0n;

  const [proposed, direct, riskSet, executed, cancelled] = await Promise.all([
    client.getContractEvents({ address: contractAddress, abi: GUARDIAN_WALLET_ABI, eventName: 'TransactionProposed', fromBlock }),
    client.getContractEvents({ address: contractAddress, abi: GUARDIAN_WALLET_ABI, eventName: 'DirectTransfer', fromBlock }),
    client.getContractEvents({ address: contractAddress, abi: GUARDIAN_WALLET_ABI, eventName: 'RiskScoreSet', fromBlock }),
    client.getContractEvents({ address: contractAddress, abi: GUARDIAN_WALLET_ABI, eventName: 'TransactionExecuted', fromBlock }),
    client.getContractEvents({ address: contractAddress, abi: GUARDIAN_WALLET_ABI, eventName: 'TransactionCancelled', fromBlock }),
  ]);

  const totalTxns = proposed.length + direct.length;
  const totalEscrowedWei = proposed.reduce((acc, l) => acc + ((l.args as { value: bigint }).value ?? 0n), 0n);
  const scores = riskSet.map(l => Number((l.args as { score: bigint }).score ?? 0n));
  const avgRisk = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const highRiskCount = scores.filter(s => s >= 60).length;
  const criticalCount = scores.filter(s => s >= 80).length;

  // Build anonymized risk detail for Venice (no raw addresses)
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
    headers: {
      'Authorization': `Bearer ${veniceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
      venice_parameters: {
        include_venice_system_prompt: false,
        enable_web_search: 'off',
        strip_thinking_response: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[Guardian Report] Venice error:', err);
    return NextResponse.json({ error: 'Venice analysis failed' }, { status: 500 });
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  const report = data.choices?.[0]?.message?.content?.trim() ?? '';

  return NextResponse.json({
    report,
    generatedAt: new Date().toISOString(),
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
  });
}
