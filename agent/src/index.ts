import 'dotenv/config';
import { Config } from './types.js';
import { startMonitor } from './monitor.js';
import { registerAgent } from './erc8004.js';
import { ethers } from 'ethers';

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

async function main(): Promise<void> {
  console.log('========================================');
  console.log('  VIGIL — Elder Financial Fraud Guard   ');
  console.log('========================================');

  const config: Config = {
    rpcUrl: process.env.RPC_URL ?? 'https://sepolia.base.org',
    contractAddress: requireEnv('CONTRACT_ADDRESS'),
    agentPrivateKey: requireEnv('AGENT_PRIVATE_KEY'),
    veniceApiKey: requireEnv('VENICE_API_KEY'),
    telegramBotToken: requireEnv('TELEGRAM_BOT_TOKEN'),
    telegramChatId: requireEnv('TELEGRAM_CHAT_ID'),
    seenAddressesPath: process.env.SEEN_ADDRESSES_PATH ?? './data/seen_addresses.json',
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS ?? '15000'),
    erc8004RegistryAddress: process.env.ERC8004_REGISTRY_ADDRESS ?? '',
  };

  const erc8004RegistryAddress = process.env.ERC8004_REGISTRY_ADDRESS ?? '';
  const agentUri = process.env.AGENT_URI ?? 'https://raw.githubusercontent.com/drewmanley16/vigil/main/docs/agent-registration.json';

  // Ensure data directory exists
  const { mkdirSync } = await import('fs');
  const { dirname } = await import('path');
  mkdirSync(dirname(config.seenAddressesPath), { recursive: true });

  // Register agent on ERC-8004 if registry configured and no agentId saved
  let agentId = parseInt(process.env.AGENT_ID ?? '0');

  if (erc8004RegistryAddress && agentId === 0) {
    try {
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      const agentWallet = new ethers.Wallet(config.agentPrivateKey, provider);
      agentId = await registerAgent(erc8004RegistryAddress, agentWallet, agentUri);
      console.log(`[ERC-8004] Registered with agentId=${agentId}. Set AGENT_ID=${agentId} in .env to skip re-registration.`);
    } catch (err) {
      console.warn('[ERC-8004] Registration failed (non-fatal):', err);
    }
  }

  await startMonitor(config, agentId, erc8004RegistryAddress);

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n[Vigil] Shutting down gracefully...');
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[Vigil] Fatal error:', err);
  process.exit(1);
});
