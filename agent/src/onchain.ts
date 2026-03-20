import { ethers } from 'ethers';

// Minimal ABI — only the functions and events the agent needs
export const GUARDIAN_WALLET_ABI = [
  // Events
  'event TransactionProposed(uint256 indexed txId, address indexed to, uint256 value, bytes data, uint256 timestamp)',
  'event DirectTransfer(address indexed to, uint256 value, uint256 timestamp)',
  'event RiskScoreSet(uint256 indexed txId, uint256 score, string reason)',
  'event SuspiciousActivityFlagged(address indexed to, uint256 value, string reason)',
  // Agent function
  'function setRiskScore(uint256 txId, uint256 score, string calldata reason) external',
  // Views
  'function owner() external view returns (address)',
  'function threshold() external view returns (uint256)',
  'function getPendingTx(uint256 txId) external view returns (tuple(address to, uint256 value, bytes data, uint256 timestamp, bool executed, bool cancelled, uint256 riskScore, string riskReason, bool riskScoreSet))',
];

export function buildContract(
  contractAddress: string,
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  return new ethers.Contract(contractAddress, GUARDIAN_WALLET_ABI, signerOrProvider);
}

export async function setRiskScoreOnChain(
  contract: ethers.Contract,
  txId: number,
  score: number,
  reason: string
): Promise<string> {
  // Truncate reason to avoid excessive gas cost
  const truncatedReason = reason.length > 200 ? reason.slice(0, 197) + '...' : reason;

  const tx = await contract.setRiskScore(txId, score, truncatedReason);
  const receipt = await tx.wait();
  console.log(`[OnChain] setRiskScore txId=${txId} score=${score} hash=${receipt.hash}`);
  return receipt.hash as string;
}
