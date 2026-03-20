import { ethers } from 'ethers';
import { AnalysisBundle } from './types.js';

// ERC-8004 Identity Registry on Base Sepolia
// See: https://eips.ethereum.org/EIPS/eip-8004
export const ERC8004_REGISTRY_ABI = [
  'function register(string calldata agentUri) external returns (uint256 agentId)',
  'function giveFeedback(uint256 agentId, uint8 rating, string calldata comment) external',
  'function getAgent(uint256 agentId) external view returns (address owner, string memory agentUri, uint256 registeredAt)',
  'event AgentRegistered(uint256 indexed agentId, address indexed owner, string agentUri)',
  'event FeedbackGiven(uint256 indexed agentId, address indexed from, uint8 rating, string comment)',
];

export async function registerAgent(
  registryAddress: string,
  signer: ethers.Signer,
  agentUri: string
): Promise<number> {
  const registry = new ethers.Contract(registryAddress, ERC8004_REGISTRY_ABI, signer);
  const tx = await registry.register(agentUri);
  const receipt = await tx.wait();

  // Parse AgentRegistered event to get agentId
  const iface = new ethers.Interface(ERC8004_REGISTRY_ABI);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === 'AgentRegistered') {
        const agentId = Number(parsed.args.agentId);
        console.log(`[ERC-8004] Vigil registered with agentId=${agentId} uri=${agentUri}`);
        return agentId;
      }
    } catch {
      // not our event
    }
  }

  throw new Error('AgentRegistered event not found in receipt');
}

export async function emitFeedbackReceipt(
  registryAddress: string,
  signer: ethers.Signer,
  agentId: number,
  bundle: AnalysisBundle
): Promise<string> {
  const registry = new ethers.Contract(registryAddress, ERC8004_REGISTRY_ABI, signer);

  // Rating: 1-5 based on risk level (not a judgment of the transaction, but a signal quality rating)
  // This receipt proves the agent analyzed the transaction on-chain
  const ratingMap: Record<string, number> = {
    LOW: 5,
    MEDIUM: 4,
    HIGH: 3,
    CRITICAL: 2,
  };
  const rating = ratingMap[bundle.veniceResult.riskLevel] ?? 3;

  const comment = JSON.stringify({
    txHash: bundle.transaction.hash,
    riskScore: bundle.veniceResult.riskScore,
    riskLevel: bundle.veniceResult.riskLevel,
    action: bundle.veniceResult.recommendedAction,
    signals: bundle.signals.filter((s) => s.triggered).map((s) => s.signal),
    analyzedAt: new Date().toISOString(),
    model: 'venice/llama-3.3-70b',
  });

  const tx = await registry.giveFeedback(agentId, rating, comment);
  const receipt = await tx.wait();
  console.log(`[ERC-8004] Feedback receipt emitted for txHash=${bundle.transaction.hash} receiptHash=${receipt.hash}`);
  return receipt.hash as string;
}
