/**
 * Paginated event fetcher for Base Sepolia.
 * The RPC caps eth_getLogs at 10,000 blocks per request; we use 9,000 as the safe limit.
 * The GuardianWallet contract was deployed at block 39109265.
 */
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { GUARDIAN_WALLET_ABI, CONTRACT_ADDRESS } from './contract';

export const DEPLOYMENT_BLOCK = 39109265n;
export const CHUNK_SIZE = 9000n;

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

type EventName =
  | 'TransactionProposed'
  | 'DirectTransfer'
  | 'RiskScoreSet'
  | 'TransactionExecuted'
  | 'TransactionCancelled'
  | 'SuspiciousActivityFlagged';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyLog = any;

export async function fetchAllEvents(eventName: EventName): Promise<AnyLog[]> {
  if (!CONTRACT_ADDRESS) return [];

  const currentBlock = await publicClient.getBlockNumber();
  const all: AnyLog[] = [];

  let fromBlock = DEPLOYMENT_BLOCK;
  while (fromBlock <= currentBlock) {
    const toBlock = fromBlock + CHUNK_SIZE < currentBlock
      ? fromBlock + CHUNK_SIZE
      : currentBlock;

    const logs = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESS,
      abi: GUARDIAN_WALLET_ABI,
      eventName,
      fromBlock,
      toBlock,
    });
    all.push(...logs);
    fromBlock = toBlock + 1n;
  }

  return all;
}

export async function fetchAllEventsBatch(eventNames: EventName[]): Promise<Record<string, AnyLog[]>> {
  if (!CONTRACT_ADDRESS) return Object.fromEntries(eventNames.map(n => [n, []]));

  const currentBlock = await publicClient.getBlockNumber();
  const results: Record<string, AnyLog[]> =
    Object.fromEntries(eventNames.map(n => [n, []]));

  let fromBlock = DEPLOYMENT_BLOCK;
  while (fromBlock <= currentBlock) {
    const toBlock = fromBlock + CHUNK_SIZE < currentBlock
      ? fromBlock + CHUNK_SIZE
      : currentBlock;

    const chunkResults = await Promise.all(
      eventNames.map(eventName =>
        publicClient.getContractEvents({
          address: CONTRACT_ADDRESS,
          abi: GUARDIAN_WALLET_ABI,
          eventName,
          fromBlock,
          toBlock,
        })
      )
    );

    eventNames.forEach((name, i) => {
      results[name].push(...chunkResults[i]);
    });

    fromBlock = toBlock + 1n;
  }

  return results;
}
