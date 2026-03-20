import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { Transaction, Config, AnalysisBundle } from './types.js';
import { detectSignals, computeCompositeScore } from './signals.js';
import { analyzeWithVenice } from './analyzer.js';
import { sendTelegramAlert } from './alerts.js';
import { GUARDIAN_WALLET_ABI, buildContract, setRiskScoreOnChain } from './onchain.js';
import { emitFeedbackReceipt } from './erc8004.js';

let seenAddresses: Set<string>;
let lastProcessedBlock: number;

function loadSeenAddresses(filePath: string): Set<string> {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
}

function saveSeenAddresses(filePath: string, addresses: Set<string>): void {
  fs.writeFileSync(filePath, JSON.stringify([...addresses]), 'utf-8');
}

export async function startMonitor(
  config: Config,
  agentId: number,
  erc8004RegistryAddress: string
): Promise<void> {
  seenAddresses = loadSeenAddresses(config.seenAddressesPath);

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const agentWallet = new ethers.Wallet(config.agentPrivateKey, provider);
  const contract = buildContract(config.contractAddress, agentWallet);
  const contractReadOnly = buildContract(config.contractAddress, provider);

  lastProcessedBlock = await provider.getBlockNumber();
  console.log(`[Monitor] Starting from block ${lastProcessedBlock}`);
  console.log(`[Monitor] Watching contract ${config.contractAddress}`);

  // ─── Real-time event subscriptions ─────────────────────────────────────────

  contractReadOnly.on(
    'TransactionProposed',
    async (txId, to, value, data, timestamp, event) => {
      console.log(`[Event] TransactionProposed txId=${txId} to=${to} value=${ethers.formatEther(value)} ETH`);
      const blockNumber = event.log.blockNumber;

      const tx: Transaction = {
        hash: event.log.transactionHash,
        from: config.contractAddress, // contract is the sender
        to,
        value,
        data,
        blockNumber,
        timestamp: Number(timestamp),
        isContractInteraction: data !== '0x' && data !== '',
        isFirstTimeRecipient: !seenAddresses.has(to.toLowerCase()),
        txId: Number(txId),
      };

      await processTransaction(tx, contract, agentWallet, config, agentId, erc8004RegistryAddress);
    }
  );

  contractReadOnly.on(
    'DirectTransfer',
    async (to, value, timestamp, event) => {
      console.log(`[Event] DirectTransfer to=${to} value=${ethers.formatEther(value)} ETH`);
      const blockNumber = event.log.blockNumber;

      const tx: Transaction = {
        hash: event.log.transactionHash,
        from: config.contractAddress,
        to,
        value,
        data: '0x',
        blockNumber,
        timestamp: Number(timestamp),
        isContractInteraction: false,
        isFirstTimeRecipient: !seenAddresses.has(to.toLowerCase()),
      };

      await processTransaction(tx, contract, agentWallet, config, agentId, erc8004RegistryAddress);
    }
  );

  console.log('[Monitor] Real-time event subscriptions active');

  // ─── Polling fallback ───────────────────────────────────────────────────────

  setInterval(async () => {
    try {
      const currentBlock = await provider.getBlockNumber();
      if (currentBlock <= lastProcessedBlock) return;

      const fromBlock = lastProcessedBlock + 1;
      const toBlock = currentBlock;

      const proposedLogs = await contractReadOnly.queryFilter(
        contractReadOnly.filters.TransactionProposed(),
        fromBlock,
        toBlock
      );

      const directLogs = await contractReadOnly.queryFilter(
        contractReadOnly.filters.DirectTransfer(),
        fromBlock,
        toBlock
      );

      if (proposedLogs.length > 0 || directLogs.length > 0) {
        console.log(`[Poll] Found ${proposedLogs.length} proposed + ${directLogs.length} direct txns in blocks ${fromBlock}-${toBlock}`);
      }

      lastProcessedBlock = currentBlock;
    } catch (err) {
      console.error('[Poll] Error during poll:', err);
    }
  }, config.pollIntervalMs);

  console.log(`[Monitor] Polling fallback every ${config.pollIntervalMs / 1000}s`);
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
    const signals = detectSignals(tx);
    const compositeScore = computeCompositeScore(signals);

    console.log(`[Analysis] compositeScore=${compositeScore} signals=[${signals.filter(s => s.triggered).map(s => s.signal).join(',')}]`);

    const veniceResult = await analyzeWithVenice(tx, signals, compositeScore, config.veniceApiKey);

    const bundle: AnalysisBundle = { transaction: tx, signals, compositeScore, veniceResult };

    // Record seen address
    if (tx.to) {
      seenAddresses.add(tx.to.toLowerCase());
      saveSeenAddresses(config.seenAddressesPath, seenAddresses);
    }

    // Write risk score on-chain for proposed (escrowed) transactions
    if (tx.txId !== undefined) {
      try {
        await setRiskScoreOnChain(contract, tx.txId, veniceResult.riskScore, veniceResult.reasoning);
      } catch (err) {
        console.error('[OnChain] Failed to set risk score:', err);
      }
    }

    // Emit ERC-8004 feedback receipt
    try {
      await emitFeedbackReceipt(erc8004RegistryAddress, signer, agentId, bundle);
    } catch (err) {
      console.error('[ERC-8004] Failed to emit receipt:', err);
    }

    // Send Telegram alert if not clearly safe
    if (veniceResult.recommendedAction !== 'ALLOW') {
      await sendTelegramAlert(bundle, config.telegramBotToken, config.telegramChatId, config.contractAddress);
    }
  } catch (err) {
    console.error('[Monitor] Error processing transaction:', err);
  }
}
