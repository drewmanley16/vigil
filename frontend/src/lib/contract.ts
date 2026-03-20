export const GUARDIAN_WALLET_ABI = [
  // Events
  {
    type: 'event',
    name: 'TransactionProposed',
    inputs: [
      { indexed: true, name: 'txId', type: 'uint256' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
      { indexed: false, name: 'data', type: 'bytes' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'TransactionExecuted',
    inputs: [
      { indexed: true, name: 'txId', type: 'uint256' },
      { indexed: true, name: 'approvedBy', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'TransactionCancelled',
    inputs: [
      { indexed: true, name: 'txId', type: 'uint256' },
      { indexed: true, name: 'cancelledBy', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'DirectTransfer',
    inputs: [
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'RiskScoreSet',
    inputs: [
      { indexed: true, name: 'txId', type: 'uint256' },
      { indexed: false, name: 'score', type: 'uint256' },
      { indexed: false, name: 'reason', type: 'string' },
    ],
  },
  {
    type: 'event',
    name: 'SuspiciousActivityFlagged',
    inputs: [
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
      { indexed: false, name: 'reason', type: 'string' },
    ],
  },
  // Functions
  {
    type: 'function',
    name: 'approve',
    inputs: [{ name: 'txId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'cancel',
    inputs: [{ name: 'txId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'propose',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [{ name: 'txId', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'executeDirectly',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'addGuardian',
    inputs: [
      { name: 'guardian', type: 'address' },
      { name: 'telegramHandle', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setThreshold',
    inputs: [{ name: 'newThreshold', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getPendingTx',
    inputs: [{ name: 'txId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'executed', type: 'bool' },
          { name: 'cancelled', type: 'bool' },
          { name: 'riskScore', type: 'uint256' },
          { name: 'riskReason', type: 'string' },
          { name: 'riskScoreSet', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'threshold',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isGuardian',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'txCount',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? '') as `0x${string}`;
