/**
 * Live activity log — appended as the agent processes each transaction.
 * Written to disk at ./data/agent_log.json and served at /agent-log.
 */
import fs from 'fs';
import { ethers } from 'ethers';

export interface ActivityEntry {
  ts: string;
  type: 'TransactionProposed' | 'DirectTransfer' | 'PatternAlert' | 'x402Session';
  txId: number | null;
  value: string | null;
  valueFmt: string | null;
  signals: string[];
  veniceScore: number | null;
  veniceLevel: string | null;
  veniceReasoning: string | null;
  action: string | null;
  outcome?: string;
  onChainSetRiskScore: boolean;
  telegramAlertSent: boolean;
  erc8004FeedbackHash: string | null;
}

interface ActivityLog {
  schemaVersion: string;
  agent: string;
  agentId: number;
  contractAddress: string;
  network: string;
  updatedAt: string;
  summary: {
    totalEventsProcessed: number;
    threatsDetected: number;
    escrowInterceptions: number;
    directTransfers: number;
    veniceCallsMade: number;
    patternAlertsTriggered: number;
    totalEthEscrowedWei: string;
  };
  events: ActivityEntry[];
}

const MAX_EVENTS = 100;

let _logPath = './data/agent_log.json';
let _log: ActivityLog = {
  schemaVersion: '1.0',
  agent: 'Vigil',
  agentId: 0,
  contractAddress: '',
  network: 'base-sepolia',
  updatedAt: new Date().toISOString(),
  summary: {
    totalEventsProcessed: 0,
    threatsDetected: 0,
    escrowInterceptions: 0,
    directTransfers: 0,
    veniceCallsMade: 0,
    patternAlertsTriggered: 0,
    totalEthEscrowedWei: '0',
  },
  events: [],
};

export function initActivityLog(logPath: string, agentId: number, contractAddress: string): void {
  _logPath = logPath;
  _log.agentId = agentId;
  _log.contractAddress = contractAddress;

  // Load existing log if present
  try {
    const existing = JSON.parse(fs.readFileSync(logPath, 'utf-8')) as ActivityLog;
    if (existing.schemaVersion === '1.0' && existing.agent === 'Vigil') {
      _log = existing;
      _log.agentId = agentId;
      _log.contractAddress = contractAddress;
      console.log(`[ActivityLog] Loaded ${_log.events.length} existing events from ${logPath}`);
    }
  } catch {
    // No existing log — start fresh
  }
}

export function appendActivityLog(
  entry: ActivityEntry,
  summaryUpdate: Partial<ActivityLog['summary']>,
): void {
  // Prepend (newest first), cap at MAX_EVENTS
  _log.events.unshift(entry);
  if (_log.events.length > MAX_EVENTS) {
    _log.events = _log.events.slice(0, MAX_EVENTS);
  }

  // Update summary counters
  _log.summary.totalEventsProcessed += 1;
  if (summaryUpdate.threatsDetected) _log.summary.threatsDetected += summaryUpdate.threatsDetected;
  if (summaryUpdate.escrowInterceptions) _log.summary.escrowInterceptions += summaryUpdate.escrowInterceptions;
  if (summaryUpdate.directTransfers) _log.summary.directTransfers += summaryUpdate.directTransfers;
  if (summaryUpdate.veniceCallsMade) _log.summary.veniceCallsMade += summaryUpdate.veniceCallsMade;
  if (summaryUpdate.patternAlertsTriggered) _log.summary.patternAlertsTriggered += summaryUpdate.patternAlertsTriggered;
  if (summaryUpdate.totalEthEscrowedWei) {
    _log.summary.totalEthEscrowedWei = (
      BigInt(_log.summary.totalEthEscrowedWei) + BigInt(summaryUpdate.totalEthEscrowedWei)
    ).toString();
  }

  _log.updatedAt = new Date().toISOString();
  _flush();
}

export function appendX402Session(paymentWei: string, reportGenerated: boolean, veniceCallMs: number): void {
  const entry: ActivityEntry = {
    ts: new Date().toISOString(),
    type: 'x402Session',
    txId: null,
    value: paymentWei,
    valueFmt: `${paymentWei} wei`,
    signals: [],
    veniceScore: null,
    veniceLevel: null,
    veniceReasoning: null,
    action: reportGenerated ? 'REPORT_GENERATED' : 'REPORT_FAILED',
    onChainSetRiskScore: false,
    telegramAlertSent: false,
    erc8004FeedbackHash: null,
  };
  // Add x402 metadata
  (entry as ActivityEntry & { x402: unknown }).x402 = { paymentWei, veniceCallMs };
  _log.events.unshift(entry);
  if (_log.events.length > MAX_EVENTS) _log.events = _log.events.slice(0, MAX_EVENTS);
  _log.updatedAt = new Date().toISOString();
  _flush();
}

export function getActivityLog(): ActivityLog {
  return { ..._log, updatedAt: new Date().toISOString() };
}

function _flush(): void {
  try {
    fs.mkdirSync(require_dirname(_logPath), { recursive: true });
    fs.writeFileSync(_logPath, JSON.stringify(_log, null, 2), 'utf-8');
  } catch (err) {
    console.error('[ActivityLog] Failed to write:', err);
  }
}

function require_dirname(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/');
  parts.pop();
  return parts.join('/') || '.';
}

// Expose for use in ethers.formatEther context
export { ethers };
