// Shared in-memory stats store — updated by monitor, served by HTTP server

export interface AgentStats {
  startedAt: string;
  agentId: number;
  contractAddress: string;
  transactionsMonitored: number;
  threatsDetected: number;       // recommendedAction !== 'ALLOW'
  escrowInterceptions: number;   // TransactionProposed events processed
  directTransfers: number;       // DirectTransfer events processed
  veniceCallsMade: number;
  veniceCallsFailed: number;
  totalEthAnalyzedWei: string;   // stringified bigint
  totalEthEscrowedWei: string;   // stringified bigint — funds intercepted in escrow
  patternAlertsTriggered: number;
  lastPollAt: string | null;
  lastThreatAt: string | null;
}

const _startTime = Date.now();

export const stats: {
  startedAt: string;
  agentId: number;
  contractAddress: string;
  transactionsMonitored: number;
  threatsDetected: number;
  escrowInterceptions: number;
  directTransfers: number;
  veniceCallsMade: number;
  veniceCallsFailed: number;
  totalEthAnalyzedWei: bigint;
  totalEthEscrowedWei: bigint;
  patternAlertsTriggered: number;
  lastPollAt: string | null;
  lastThreatAt: string | null;
} = {
  startedAt: new Date().toISOString(),
  agentId: 0,
  contractAddress: '',
  transactionsMonitored: 0,
  threatsDetected: 0,
  escrowInterceptions: 0,
  directTransfers: 0,
  veniceCallsMade: 0,
  veniceCallsFailed: 0,
  totalEthAnalyzedWei: 0n,
  totalEthEscrowedWei: 0n,
  patternAlertsTriggered: 0,
  lastPollAt: null,
  lastThreatAt: null,
};

export function getStats(): AgentStats {
  return {
    startedAt: stats.startedAt,
    agentId: stats.agentId,
    contractAddress: stats.contractAddress,
    transactionsMonitored: stats.transactionsMonitored,
    threatsDetected: stats.threatsDetected,
    escrowInterceptions: stats.escrowInterceptions,
    directTransfers: stats.directTransfers,
    veniceCallsMade: stats.veniceCallsMade,
    veniceCallsFailed: stats.veniceCallsFailed,
    totalEthAnalyzedWei: stats.totalEthAnalyzedWei.toString(),
    totalEthEscrowedWei: stats.totalEthEscrowedWei.toString(),
    patternAlertsTriggered: stats.patternAlertsTriggered,
    lastPollAt: stats.lastPollAt,
    lastThreatAt: stats.lastThreatAt,
    // Computed fields injected by the server
    uptimeMs: Date.now() - _startTime,
  } as AgentStats & { uptimeMs: number };
}
