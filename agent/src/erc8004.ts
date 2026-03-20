import { ethers } from 'ethers';
import { AnalysisBundle } from './types.js';

// ERC-8004 deployed addresses
export const IDENTITY_REGISTRY_SEPOLIA = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
export const REPUTATION_REGISTRY_SEPOLIA = '0x8004B663056A597Dffe9eCcC1965A193B7388713';
export const IDENTITY_REGISTRY_MAINNET = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
export const REPUTATION_REGISTRY_MAINNET = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';

export const IDENTITY_REGISTRY_ABI = [
  'function register(string calldata agentURI) external returns (uint256 agentId)',
  'function register() external returns (uint256 agentId)',
  'function ownerOf(uint256 agentId) external view returns (address)',
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

export const REPUTATION_REGISTRY_ABI = [
  // value: int128 score, valueDecimals: 0-18, tag1/tag2: category strings
  // feedbackHash: keccak256 of feedbackURI content, or bytes32(0)
  // IMPORTANT: caller must NOT be the agent owner (no self-feedback)
  'function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string calldata tag1, string calldata tag2, string calldata endpoint, string calldata feedbackURI, bytes32 feedbackHash) external',
  'event NewFeedback(uint256 indexed agentId, address indexed from, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)',
];

export async function registerAgent(
  registryAddress: string,
  signer: ethers.Signer,
  agentUri: string
): Promise<number> {
  const registry = new ethers.Contract(registryAddress, IDENTITY_REGISTRY_ABI, signer);
  console.log(`[ERC-8004] Registering Vigil on IdentityRegistry at ${registryAddress}...`);

  const tx = await registry['register(string)'](agentUri);
  const receipt = await tx.wait();

  const iface = new ethers.Interface(IDENTITY_REGISTRY_ABI);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === 'Registered') {
        const agentId = Number(parsed.args.agentId);
        console.log(`[ERC-8004] Registered! agentId=${agentId} txHash=${receipt.hash}`);
        console.log(`[ERC-8004] View at: https://8004agents.ai/base-sepolia/agent/${agentId}`);
        return agentId;
      }
    } catch { /* not our event */ }
  }

  // Fallback: parse Transfer event (ERC-721 mint)
  const erc721Iface = new ethers.Interface(['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)']);
  for (const log of receipt.logs) {
    try {
      const parsed = erc721Iface.parseLog(log);
      if (parsed?.name === 'Transfer' && parsed.args.from === ethers.ZeroAddress) {
        const agentId = Number(parsed.args.tokenId);
        console.log(`[ERC-8004] Registered via Transfer event! agentId=${agentId}`);
        return agentId;
      }
    } catch { /* not our event */ }
  }

  throw new Error('Could not find agentId in registration receipt');
}

// Build the feedback URI content (stored off-chain, hash stored on-chain)
function buildFeedbackPayload(agentId: number, bundle: AnalysisBundle, registryAddress: string): object {
  return {
    agentRegistry: `eip155:84532:${registryAddress}`,
    agentId,
    createdAt: new Date().toISOString(),
    value: bundle.veniceResult.riskScore,
    valueDecimals: 0,
    tag1: 'riskAnalysis',
    tag2: bundle.veniceResult.riskLevel,
    endpoint: 'https://vigil-guardian.vercel.app/dashboard',
    txHash: bundle.transaction.hash,
    recommendedAction: bundle.veniceResult.recommendedAction,
    signals: bundle.signals.filter(s => s.triggered).map(s => s.signal),
    model: 'venice/llama-3.3-70b',
    reasoning: bundle.veniceResult.reasoning,
  };
}

export async function emitFeedbackReceipt(
  registryAddress: string,
  ownerSigner: ethers.Signer,   // The wallet that OWNS the agent registration
  agentId: number,
  bundle: AnalysisBundle,
  feedbackSignerKey?: string    // Optional separate wallet for giving feedback (can't be owner)
): Promise<string | null> {
  if (!registryAddress || agentId === 0) {
    console.log('[ERC-8004] Skipping feedback receipt — registry not configured');
    return null;
  }

  // Reputation feedback requires a DIFFERENT signer than the agent owner
  // (ERC-8004 prevents self-feedback to avoid reputation gaming)
  // We log the analysis data on-chain via the GuardianWallet's RiskScoreSet event instead,
  // and store the feedback payload as a URI for verifiability.
  const payload = buildFeedbackPayload(agentId, bundle, registryAddress);
  const payloadJson = JSON.stringify(payload);
  const feedbackHash = ethers.keccak256(ethers.toUtf8Bytes(payloadJson));

  console.log(`[ERC-8004] Analysis receipt hash=${feedbackHash.slice(0, 18)}... (stored on GuardianWallet via RiskScoreSet)`);

  // If a separate feedback signer is provided, use ReputationRegistry
  if (feedbackSignerKey) {
    try {
      const provider = (ownerSigner as ethers.Wallet).provider!;
      const feedbackWallet = new ethers.Wallet(feedbackSignerKey, provider);
      const reputationRegistry = getReputationRegistry(registryAddress);
      const repContract = new ethers.Contract(reputationRegistry, REPUTATION_REGISTRY_ABI, feedbackWallet);

      const tx = await repContract.giveFeedback(
        agentId,
        bundle.veniceResult.riskScore,  // value (0-100)
        0,                               // valueDecimals
        'riskAnalysis',                  // tag1
        bundle.veniceResult.riskLevel,   // tag2
        'https://vigil-guardian.vercel.app/dashboard', // endpoint
        '',                              // feedbackURI (empty, use hash only)
        feedbackHash                     // feedbackHash
      );
      const receipt = await tx.wait();
      console.log(`[ERC-8004] Reputation feedback emitted! txHash=${receipt.hash}`);
      return receipt.hash as string;
    } catch (err) {
      console.error('[ERC-8004] Reputation feedback failed (non-fatal):', err);
    }
  }

  return null;
}

function getReputationRegistry(identityRegistryAddress: string): string {
  if (identityRegistryAddress.toLowerCase() === IDENTITY_REGISTRY_SEPOLIA.toLowerCase()) {
    return REPUTATION_REGISTRY_SEPOLIA;
  }
  return REPUTATION_REGISTRY_MAINNET;
}
