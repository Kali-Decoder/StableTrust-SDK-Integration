# StableTrust BNB Demo UI

Frontend demo for confidential transfers on BNB Smart Chain Testnet.

## What It Does
- connects a wallet
- switches to BNB testnet
- registers a confidential account
- shows public and shielded balances
- deposits, transfers, and withdraws confidentially
- shows tx status and explorer links

## Stack
- Next.js
- React
- wagmi + RainbowKit
- ethers
- local `stabletrust-sdk`

## Environment
Create `.env.local` in `ui-task/`:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_BNB_RPC_URL=https://data-seed-prebsc-1-s1.bnbchain.org:8545/
NEXT_PUBLIC_BNB_EXPLORER_URL=https://testnet.bscscan.com/tx/
NEXT_PUBLIC_BNB_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_BNB_TOKEN_SYMBOL=mSTB
NEXT_PUBLIC_BNB_STABLETRUST_CONTRACT_ADDRESS=0x...
```

The contract address is optional if you want to use the SDK default for chain `97`.

## Run
```bash
cd ui-task
npm install
npm run dev
```

Open `http://localhost:3000`.

## Notes
- Confidential keys are stored in localStorage for the active wallet.
- The app is tuned for BNB testnet, not generic multi-chain use.
