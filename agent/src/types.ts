export interface Transaction {
  hash: string;
  from: string;
  to: string | null;
  value: bigint;
  data: string;
  blockNumber: number;
  timestamp: number;
  isContractInteraction: boolean;
  isFirstTimeRecipient: boolean;
  txId?: number; // set for proposed (escrowed) transactions
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RecommendedAction = 'ALLOW' | 'ALERT_GUARDIAN' | 'REQUIRE_APPROVAL';

export interface VeniceAnalysisResult {
  riskScore: number;
  riskLevel: RiskLevel;
  reasoning: string;
  recommendedAction: RecommendedAction;
  confidence: number;
}

export interface SignalResult {
  signal: string;
  triggered: boolean;
  weight: number;
  description: string;
}

export interface AnalysisBundle {
  transaction: Transaction;
  signals: SignalResult[];
  compositeScore: number;
  veniceResult: VeniceAnalysisResult;
}

export interface Config {
  rpcUrl: string;
  contractAddress: string;
  agentPrivateKey: string;
  veniceApiKey: string;
  telegramBotToken: string;
  telegramChatId: string;
  seenAddressesPath: string;
  pollIntervalMs: number;
  erc8004RegistryAddress: string;
}
