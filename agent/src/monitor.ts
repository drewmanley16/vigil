import { ethers } from 'ethers';
import fs from 'fs';
import { Transaction, Config, AnalysisBundle } from './types.js';
import { detectSignals, computeCompositeScore } from './signals.js';
import { analyzeWithVenice, analyzeSessionPattern, RecentTxSummary } from './analyzer.js';
import { sendTelegramAlert, sendPatternAlert } from './alerts.js';
import { buildContract, setRiskScoreOnChain } from './onchain.js';
import { emitFeedbackReceipt } from './erc8004.js';
import { stats } from './stats.js';

let seenAddresses: Set<string>;
let processedTxHashes: Set<string>;
let lastProcessedBlock: number;
let processedHashesPath: string;

// Session history for behavioral pattern detection (last 30 minutes)
const SESSION_WINDOW_MS = 30 * 60 * 1000;
const sessionHistory: Array<RecentTxSummary & { ts: number }> = [];

function purgeOldSession() {
  const cutoff = Date.now() - SESSION_WINDOW_MS;
  while (sessionHistory.length > 0 && sessionHistory[0].ts < cutoff) {
    sessionHistory.shift();
  }
}

function loadSet(filePath: string): Set<string> {
  try {
    return new Set(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
  } catch {
    return new Set();
  }
}

function saveSet(filePath: string, set: Set<string>): void {
  fs.writeFileSync(filePath, JSON.stringify([...set]), 'utf-8');
}

// Backwards compat
function loadSeenAddresses(filePath: string) { return loadSet(filePath); }
function saveSeenAddresses(filePath: string, addresses: Set<string>) { saveSet(filePath, addresses); }

export async function startMonitor(
  config: Config,
  agentId: number,
  erc8004RegistryAddress: string
): Promise<void> {
  seenAddresses = loadSeenAddresses(config.seenAddressesPath);
  processedHashesPath = config.seenAddressesPath.replace('seen_addresses', 'processed_hashes');
  processedTxHashes = loadSet(processedHashesPath);

  // Init stats
  stats.contractAddress = config.contractAddress;
  stats.agentId = agentId;

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const agentWallet = new ethers.Wallet(config.agentPrivateKey, provider);
  const contract = buildContract(config.contractAddress, agentWallet);
  const contractReadOnly = buildContract(config.contractAddress, provider);

  lastProcessedBlock = (await provider.getBlockNumber()) - 1;
  console.log(`[Monitor] Starting from block ${lastProcessedBlock}`);
  console.log(`[Monitor] Watching contract ${config.contractAddress}`);

  // Poll for new events every interval (public RPCs don't support eth_filters)
  const poll = async () => {
    try {
      stats.lastPollAt = new Date().toISOString();
      const currentBlock = await provider.getBlockNumber();
      if (currentBlock <= lastProcessedBlock) return;

      const fromBlock = lastProcessedBlock + 1;
      const toBlock = currentBlock;

      const [proposedLogs, directLogs] = await Promise.all([
        contractReadOnly.queryFilter(contractReadOnly.filters.TransactionProposed(), fromBlock, toBlock),
        contractReadOnly.queryFilter(contractReadOnly.filters.DirectTransfer(), fromBlock, toBlock),
      ]);

      for (const log of proposedLogs) {
        const e = log as ethers.EventLog;
        const { txId, to, value, data, timestamp } = e.args;
        const txHash = log.transactionHash;
        if (processedTxHashes.has(txHash)) continue;
        processedTxHashes.add(txHash);
        saveSet(processedHashesPath, processedTxHashes);

        console.log(`[Event] TransactionProposed txId=${txId} to=${to} value=${ethers.formatEther(value)} ETH`);

        const tx: Transaction = {
          hash: txHash,
          from: config.contractAddress,
          to,
          value,
          data,
          blockNumber: log.blockNumber,
          timestamp: Number(timestamp),
          isContractInteraction: data !== '0x' && data !== '',
          isFirstTimeRecipient: !seenAddresses.has(to.toLowerCase()),
          txId: Number(txId),
        };

        stats.escrowInterceptions++;
        stats.transactionsMonitored++;
        stats.totalEthEscrowedWei += value;
        stats.totalEthAnalyzedWei += value;

        await processTransaction(tx, contract, agentWallet, config, agentId, erc8004RegistryAddress);
      }

      for (const log of directLogs) {
        const e = log as ethers.EventLog;
        const { to, value, timestamp } = e.args;
        const txHash = log.transactionHash;
        if (processedTxHashes.has(txHash)) continue;
        processedTxHashes.add(txHash);
        saveSet(processedHashesPath, processedTxHashes);

        console.log(`[Event] DirectTransfer to=${to} value=${ethers.formatEther(value)} ETH`);

        const tx: Transaction = {
          hash: txHash,
          from: config.contractAddress,
          to,
          value,
          data: '0x',
          blockNumber: log.blockNumber,
          timestamp: Number(timestamp),
          isContractInteraction: false,
          isFirstTimeRecipient: !seenAddresses.has(to.toLowerCase()),
        };

        stats.directTransfers++;
        stats.transactionsMonitored++;
        stats.totalEthAnalyzedWei += value;

        await processTransaction(tx, contract, agentWallet, config, agentId, erc8004RegistryAddress);
      }

      lastProcessedBlock = currentBlock;
    } catch (err) {
      console.error('[Poll] Error:', err);
    }
  };

  // Run immediately then on interval
  await poll();
  setInterval(poll, config.pollIntervalMs);
  console.log(`[Monitor] Polling every ${config.pollIntervalMs / 1000}s`);
}

async function processTransaction(
  tx: Transaction,
  contract: ethers.Contract,
  signer: ethers.Signer,
  config: Config,
  agentId: number,
  erc8004RegistryAddress: string
): Promise<void> {
  try {
    purgeOldSession();

    const signals = detectSignals(tx);
    const compositeScore = computeCompositeScore(signals);
    const triggered = signals.filter(s => s.triggered).map(s => s.signal);

    console.log(`[Analysis] compositeScore=${compositeScore} signals=[${triggered.join(',')}]`);

    // Pass recent session history to Venice for contextual analysis
    const recentHistory = sessionHistory.map(h => ({ ...h }));
    const veniceResult = await analyzeWithVenice(tx, signals, compositeScore, config.veniceApiKey, recentHistory);

    const bundle: AnalysisBundle = { transaction: tx, signals, compositeScore, veniceResult };

    // Record this transaction in session history
    const summary: RecentTxSummary & { ts: number } = {
      valueEth: parseFloat(ethers.formatEther(tx.value)).toFixed(4),
      isFirstTime: tx.isFirstTimeRecipient,
      riskScore: veniceResult.riskScore,
      riskLevel: veniceResult.riskLevel,
      triggeredSignals: triggered,
      minutesAgo: 0,
      ts: Date.now(),
    };
    sessionHistory.push(summary);

    // Record seen address
    if (tx.to) {
      seenAddresses.add(tx.to.toLowerCase());
      saveSeenAddresses(config.seenAddressesPath, seenAddresses);
    }

    // Update threat stats
    if (veniceResult.recommendedAction !== 'ALLOW') {
      stats.threatsDetected++;
      stats.lastThreatAt = new Date().toISOString();
    }

    // Write risk score on-chain for escrowed transactions
    if (tx.txId !== undefined) {
      try {
        await setRiskScoreOnChain(contract, tx.txId, veniceResult.riskScore, veniceResult.reasoning);
      } catch (err) {
        console.error('[OnChain] Failed to set risk score:', err);
      }
    }

    // Emit ERC-8004 feedback receipt
    if (erc8004RegistryAddress) {
      try {
        const feedbackSignerKey = process.env.FEEDBACK_SIGNER_KEY;
        await emitFeedbackReceipt(erc8004RegistryAddress, signer, agentId, bundle, feedbackSignerKey);
      } catch (err) {
        console.error('[ERC-8004] Failed to emit receipt:', err);
      }
    }

    // Send Telegram alert if not clearly safe
    if (veniceResult.recommendedAction !== 'ALLOW') {
      await sendTelegramAlert(bundle, config.telegramBotToken, config.telegramChatId, config.contractAddress);
    }

    // Check for session-level pattern and send a separate pattern alert
    // Trigger after 3rd+ suspicious transaction in the session window
    const suspiciousInSession = sessionHistory.filter(h => h.riskScore >= 30);
    if (suspiciousInSession.length >= 3 && veniceResult.recommendedAction !== 'ALLOW') {
      const summaryForPattern = sessionHistory.map(h => ({
        ...h,
        minutesAgo: Math.round((Date.now() - h.ts) / 60000),
      }));

      const patternSummary = await analyzeSessionPattern(summaryForPattern, config.veniceApiKey);
      if (patternSummary) {
        stats.patternAlertsTriggered++;
        await sendPatternAlert(
          patternSummary,
          sessionHistory.length,
          config.telegramBotToken,
          config.telegramChatId
        );
      }
    }
  } catch (err) {
    console.error('[Monitor] Error processing transaction:', err);
  }
}
