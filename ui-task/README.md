# StableTrust BNB Demo

This app demonstrates the full confidential transfer flow for **BNB Smart Chain Testnet** in a single frontend:

- connect an EVM wallet
- switch to BNB testnet
- initialize a confidential account
- view public and confidential balances
- deposit into confidential balance
- transfer confidentially to another address
- withdraw back to the public wallet
- track transaction status and explorer links

## Stack

- Next.js
- React
- wagmi + RainbowKit
- ethers
- the local `stabletrust-sdk` workspace source

## Environment

Create `.env.local` in `Universal-Arbitrum-Kit/`:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_BNB_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
NEXT_PUBLIC_BNB_EXPLORER_URL=https://testnet.bscscan.com/tx/
NEXT_PUBLIC_BNB_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_BNB_TOKEN_SYMBOL=TOKEN
```

Notes:

- `NEXT_PUBLIC_BNB_STABLETRUST_CONTRACT_ADDRESS` is optional; the app falls back to the SDK default for chain 97.
- `NEXT_PUBLIC_BNB_TOKEN_ADDRESS` is the ERC-20 token you want to move confidentially.
- If you omit the RPC or explorer URL, the app falls back to the SDK defaults.

## Run

```bash
cd "/Users/nikku.jr.dev/Downloads/Stabletrust-SDK Assignment/Universal-Arbitrum-Kit"
npm install
npm run dev
```

Open `http://localhost:3000`.

## What changed

- The old demo routes were removed.
- The homepage now serves the confidential transfer dashboard directly.
- The wallet UI is BNB-testnet-only and prompts the user to switch networks.
