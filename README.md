# StableTrust + Fairyring Integration

## Project Overview

This project integrates Fairblock's confidential computing stack with a BNB-compatible EVM environment. The system enables confidential token transfers using homomorphic encryption while maintaining settlement on a transparent EVM chain.

The integration consists of four primary components:

* Fairyring (Cosmos-based confidential computation layer)
* FairyPort (cross-chain relayer)
* Confidential Mirror Diamond Contract (EVM)
* StableTrust SDK and Frontend

The implementation demonstrates a complete Alice-to-Bob confidential transfer workflow.

---

## Prerequisites

### Software

* Node.js >= 20
* npm >= 10
* Go >= 1.22
* Rust toolchain
* wasm32-unknown-unknown target
* Foundry
* Anvil

### Verify Installation

```bash
node -v
go version
rustc --version
forge --version
anvil --version
```

---

## Repository Setup

```bash
mkdir fairblock-assignment
cd fairblock-assignment

git clone -b audit-3.0 https://github.com/Fairblock/fairyring.git
git clone -b audit-3.0 https://github.com/Fairblock/fairyport.git
git clone -b audit-3.0 https://github.com/Fairblock/fairyring-contract.git
git clone https://github.com/Fairblock/stabletrust-sdk.git
```

---

## Environment Variables

```env
BNB_RPC_URL=http://127.0.0.1:8545

BNB_STABLETRUST_CONTRACT_ADDRESS=<diamond-address>

BNB_TOKEN_ADDRESS=<token-address>

BNB_SENDER_PRIVATE_KEY=<sender-private-key>

BNB_RECIPIENT_PRIVATE_KEY=<recipient-private-key>
```

---

## Running The Stack

### 1. Start Fairyring Devnet

```bash
cd fairyring
make devnet-up
```

### 2. Start Anvil

```bash
anvil --block-time 1
```

### 3. Deploy CosmWasm Contract

```bash
cd fairyring-contract/examples/elgamal_evm

python3 deploy_contract.py
```

### 4. Deploy EVM Contracts

Deploy token:

```bash
forge script script/DeployToken.s.sol:DeployToken \
  --rpc-url http://127.0.0.1:8545 \
  --private-key <key> \
  --broadcast
```

Deploy diamond:

```bash
forge script script/DeployDiamond.s.sol:DeployConfidentialMirrorDiamond \
  --rpc-url http://127.0.0.1:8545 \
  --private-key <key> \
  --broadcast
```

### 5. Configure FairyPort

Update fairyport.config.yaml with:

* CosmWasm contract address
* Diamond address
* Fairyring relayer key

### 6. Start FairyPort

```bash
fairyport run -c ./fairyport.config.yaml
```

---

## Running Alice → Bob Demo

```bash
cd stabletrust-sdk

node examples/bnb-complete-flow.js
```

Expected flow:

1. Register Alice confidential account
2. Register Bob confidential account
3. Deposit tokens
4. Generate encrypted transfer
5. Relay settlement through Fairyring
6. Update encrypted balances
7. Withdraw and verify final balances

---

## Getting BNB Testnet Tokens

For local testing:

* Use Anvil default funded accounts

For public BNB Testnet:

* Use the official BNB testnet faucet
* Fund deployment wallet before deployment

---

## Known Limitations

* Local setup requires manual coordination between services
* Relayer processing introduces settlement delay
* Example scripts assume 18-decimal ERC20 tokens
* Error messages from low-level cryptographic operations can be difficult to diagnose
* Not production hardened




TOKEN_NAME="Mock Stablecoin" \
TOKEN_SYMBOL="mSTB" \
TOKEN_DECIMALS=18 \
forge script script/DeployToken.s.sol:DeployToken \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast

FEE_ACCOUNT="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" \
FEE_AMOUNT=0 \     
FEE_TOKEN="0x0000000000000000000000000000000000000000" \
OPERATORS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" \
forge script script/DeployDiamond.s.sol:DeployConfidentialMirrorDiamond \  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast

fairyport run -c ./fairyport.config.yaml
rm -rf fairyport-checkpoints-*