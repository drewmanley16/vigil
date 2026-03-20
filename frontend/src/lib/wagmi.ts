import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'Vigil — Guardian Protocol',
        url: 'https://vigil-guardian.vercel.app',
        iconUrl: 'https://vigil-guardian.vercel.app/favicon.ico',
      },
    }),
    injected({ target: 'metaMask' }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
