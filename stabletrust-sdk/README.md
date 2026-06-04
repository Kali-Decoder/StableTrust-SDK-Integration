# @fairblock/stabletrust

SDK for Fairblock confidential transfers.

## Install
```bash
npm install @fairblock/stabletrust
```

## Clients
- `ConfidentialTransferClient` — direct EVM confidential transfers
- `AnonymousTransferClient` — relay-based anonymous transfers

## Requirements
- Node.js 16+
- ethers 6+

## BNB Testnet
BNB Smart Chain Testnet is supported as chain ID `97`.

```js
import { ConfidentialTransferClient } from "@fairblock/stabletrust";

const client = new ConfidentialTransferClient(
  "https://data-seed-prebsc-1-s1.bnbchain.org:8545/",
  97,
);
```

If you deploy your own contract, pass the contract address as the second argument and the chain ID as the third.

## Common Methods
- `ensureAccount(wallet)`
- `confidentialDeposit(wallet, tokenAddress, amount)`
- `confidentialTransfer(senderWallet, recipientAddress, tokenAddress, amount)`
- `withdraw(wallet, tokenAddress, amount)`
- `getAccountInfo(address)`
- `getConfidentialBalance(address, privateKey, tokenAddress)`

## Notes
- The SDK derives confidential keys from the wallet, chain ID, and contract address.
- Withdrawals use WASM proof generation automatically.
- Anonymous transfers require Fairycloak relay access from Fairblock.
