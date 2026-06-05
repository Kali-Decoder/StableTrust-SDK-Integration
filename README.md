# StableTrust + Fairyring Demo

This repo shows an end-to-end confidential transfer flow on BNB Smart Chain Testnet using:
- Fairyring for confidential state
- FairyPort as the relayer
- a Confidential Mirror Diamond contract on EVM
- the `stabletrust-sdk` package and `ui-task` frontend

## What Works
- register Alice and Bob confidential accounts
- deposit ERC-20 tokens into shielded balance
- send confidential transfers
- withdraw back to the public wallet
- surface tx status and explorer links in the UI

## Prerequisites
- Node.js 20+
- npm 10+
- Go 1.22+
- Rust toolchain with `wasm32-unknown-unknown`
- Foundry (`forge`)
- Anvil
- a BNB testnet wallet with funds

## Setup
1. Clone this repo and the upstream Fairblock repos.
2. Start Fairyring devnet.
3. Build and deploy the Fairyring CosmWasm contract.
4. Start Anvil and deploy the mock ERC-20 plus Diamond contract.
5. Configure and start FairyPort.
6. Configure the SDK/frontend env vars and run the demo.

## Environment Variables

### Root SDK / scripts
```env
BNB_RPC_URL=http://127.0.0.1:8545
BNB_STABLETRUST_CONTRACT_ADDRESS=0x63bF1207C75060b303f2895574584700d53988ac
BNB_TOKEN_ADDRESS=0xC915876c59f8A902bE7E67cAce5083fb7d790ECe
BNB_SENDER_PRIVATE_KEY=0x...
BNB_RECIPIENT_PRIVATE_KEY=0x...
```

### Frontend
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_BNB_RPC_URL=https://data-seed-prebsc-1-s1.bnbchain.org:8545/
NEXT_PUBLIC_BNB_EXPLORER_URL=https://testnet.bscscan.com/tx/
NEXT_PUBLIC_BNB_TOKEN_ADDRESS=0xC915876c59f8A902bE7E67cAce5083fb7d790ECe
NEXT_PUBLIC_BNB_TOKEN_SYMBOL=mSTB
NEXT_PUBLIC_BNB_STABLETRUST_CONTRACT_ADDRESS=0x63bF1207C75060b303f2895574584700d53988ac
```

## Full Demo Flow
From a clean start:
1. Start Fairyring devnet.
2. Deploy the CosmWasm contract.
3. Start Anvil.
4. Deploy the token and Diamond.
5. Update `fairyport/fairyport.config.yaml`.
6. Start FairyPort.
7. Run `node examples/bnb-complete-flow.js` from `stabletrust-sdk/` or use the frontend.

## BNB Testnet Tokens
- Get test BNB from the official BNB Chain faucet.
- Fund the deployment wallet before deploying contracts.
- The demo token is a mock ERC-20, so only BNB is needed for gas.

## Limitations
- The stack is still a local/dev integration, not production-ready.
- Several steps require manual config sync.
- Relayer startup and settlement are not fully automated.
- Crypto and relayer errors can be hard to diagnose.

## Submission
- Repository link: replace with your GitHub URL
- Final commit hash: replace with the commit you submit
- Demo video: add a link here if required
