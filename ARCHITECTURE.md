# ARCHITECTURE.md

# StableTrust + Fairyring Integration Architecture

## Overview

This project integrates Fairblock's confidential computing stack with an EVM-compatible blockchain environment to enable privacy-preserving token transfers. The architecture combines four independent components:

1. **Fairyring** – Cosmos-based confidential computation network
2. **FairyPort** – Cross-chain relayer responsible for synchronizing state between EVM and Fairyring
3. **Confidential Mirror Diamond Contract** – EVM smart contract managing encrypted balances and confidential actions
4. **StableTrust SDK & Frontend** – User-facing application layer for interacting with confidential accounts

The goal is to allow users to perform deposits, transfers, and withdrawals while keeping balances and transfer amounts encrypted.

---

# System Architecture

```text
┌───────────────────────────────────────────────┐
│                Frontend (React)               │
│                                               │
│ - Account Connection                          │
│ - Deposit UI                                  │
│ - Transfer UI                                 │
│ - Withdrawal UI                               │
│ - Activity Monitoring                         │
└───────────────────┬───────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────┐
│              StableTrust SDK                  │
│                                               │
│ - Account Registration                        │
│ - Encryption Utilities                        │
│ - Transaction Construction                    │
│ - Balance Queries                             │
│ - Proof Generation                            │
└───────────────────┬───────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────┐
│      Confidential Mirror Diamond Contract     │
│                  (EVM Layer)                  │
│                                               │
│ - Confidential Accounts                       │
│ - Encrypted Balances                          │
│ - Pending Actions Queue                       │
│ - Deposit / Transfer / Withdraw Logic         │
└───────────────────┬───────────────────────────┘
                    │
                    │ Events
                    ▼
┌───────────────────────────────────────────────┐
│                FairyPort                      │
│            (Go Relayer Service)               │
│                                               │
│ - Watches EVM Events                          │
│ - Reads Pending Actions                       │
│ - Generates CosmWasm Messages                 │
│ - Listens For Fairyring Results               │
│ - Finalizes EVM State                         │
└───────────────────┬───────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────┐
│                 Fairyring                     │
│         Confidential Computation Layer        │
│                                               │
│ - Validator Consensus                         │
│ - Cryptographic Verification                  │
│ - Ciphertext Processing                       │
│ - Account Registration                        │
│ - State Settlement                            │
└───────────────────────────────────────────────┘
```

---

# Component Responsibilities

## 1. Fairyring

Fairyring serves as the confidential execution layer.

Responsibilities include:

* Maintaining encrypted account state
* Processing confidential account creation requests
* Executing cryptographic operations
* Validating encrypted state transitions
* Producing finalized confidential results
* Coordinating validator consensus

Fairyring acts as the trusted computation environment for the system.

---

## 2. FairyPort

FairyPort is the bridge between the EVM environment and Fairyring.

Responsibilities include:

### EVM Side

* Monitor contract events
* Read pending actions from the Diamond contract
* Decode confidential operations

### Fairyring Side

* Build CosmWasm execute messages
* Submit transactions to Fairyring
* Monitor transaction completion

### Settlement Side

* Receive finalized computation results
* Submit finalization transactions back to EVM
* Clear processed pending actions

Without FairyPort, the EVM contract and Fairyring cannot communicate.

---

## 3. Confidential Mirror Diamond Contract

The Diamond contract acts as the EVM gateway for confidential operations.

Responsibilities:

* Register confidential accounts
* Store encrypted balances
* Maintain pending action queues
* Accept deposits
* Initiate confidential transfers
* Process withdrawals
* Track account finalization status

The Diamond follows the EIP-2535 Diamond pattern, enabling functionality to be split across multiple facets.

### Important State Objects

```solidity
struct PendingAction {
    bytes32 kind;
    address owner;
    uint256 txId;
    address token;
    address recipient;
    uint256 amount;
    uint256 feePaid;
    bytes data;
}
```

Pending actions are consumed by FairyPort and settled through Fairyring.

---

## 4. StableTrust SDK

The SDK provides a developer-friendly abstraction layer.

Responsibilities:

* Account creation
* Key management
* Encryption handling
* Transaction creation
* Balance retrieval
* Proof generation
* Event monitoring

The SDK hides cryptographic complexity from application developers.

### Primary SDK Components

```text
ConfidentialTransferClient
├── ensureAccount()
├── deposit()
├── confidentialTransfer()
├── withdraw()
├── getAccountInfo()
└── getConfidentialBalance()
```

---

# Confidential Transfer Lifecycle

## Step 1: Account Registration

Alice creates a confidential account.

```text
Frontend
   ↓
SDK ensureAccount()
   ↓
Diamond Contract
   ↓
Pending Action Created
```

---

## Step 2: Relay Processing

FairyPort detects the account creation request.

```text
Diamond Event
   ↓
FairyPort
   ↓
CosmWasm Execute Message
   ↓
Fairyring
```

---

## Step 3: Account Finalization

Fairyring processes the request.

```text
Fairyring
   ↓
Finalized State
   ↓
FairyPort
   ↓
Diamond Finalization
```

Account becomes usable after finalization.

---

## Step 4: Confidential Deposit

User deposits tokens.

```text
ERC20 Approval
   ↓
Deposit Request
   ↓
Encrypted Balance Updated
```

No plaintext balance is exposed.

---

## Step 5: Confidential Transfer

Alice transfers assets to Bob.

```text
Alice
   ↓
SDK Encryption
   ↓
Diamond Contract
   ↓
Pending Transfer Action
   ↓
FairyPort
   ↓
Fairyring Processing
   ↓
Settlement
```

Transfer amount remains encrypted throughout the process.

---

## Step 6: Withdrawal

User requests withdrawal.

```text
Encrypted Balance
   ↓
Withdrawal Request
   ↓
Fairyring Validation
   ↓
Token Release
```

Only the withdrawal result becomes visible on-chain.

---

# SDK Integration Architecture

To simplify frontend integration, the SDK layer was isolated from UI concerns.

### Frontend Layer

Responsible for:

* User interactions
* Form validation
* Wallet connection
* Displaying results

### SDK Layer

Responsible for:

* Cryptographic operations
* Contract communication
* Proof generation
* State synchronization

This separation allows the frontend to remain lightweight while the SDK manages protocol complexity.

---

# Frontend Architecture

The frontend follows a modular architecture:

```text
src/
├── components/
│   ├── Deposit
│   ├── Transfer
│   ├── Withdraw
│   └── ActivityFeed
│
├── hooks/
│   ├── useWallet
│   ├── useBalances
│   └── useTransfers
│
├── services/
│   └── StableTrustSDK
│
└── pages/
```

Benefits:

* Reusable UI modules
* Easier testing
* Clear separation of concerns
* Simplified SDK integration

---

# Design Decisions

## Why Fairyring?

Confidential computation requires a dedicated execution environment capable of processing encrypted state transitions. Fairyring provides this capability while maintaining decentralized consensus.

## Why FairyPort?

Separating relayer logic from smart contracts reduces complexity and enables independent upgrades without redeploying core contracts.

## Why a Diamond Contract?

The Diamond pattern allows modular development and future extensibility while avoiding contract size limitations.

## Why an SDK Layer?

Direct cryptographic interaction is complex for application developers. The SDK abstracts protocol-specific operations and provides a familiar developer experience.

---

# Tradeoffs

### Advantages

* Strong confidentiality guarantees
* Modular architecture
* Upgradeable contract design
* Clear separation of responsibilities

### Disadvantages

* Additional infrastructure requirements
* Relayer dependency
* Increased transaction settlement time
* More complex debugging compared to standard ERC20 transfers

---

# Summary

The system combines EVM smart contracts, a Cosmos-based confidential computation layer, and a relayer bridge to enable encrypted token operations. The architecture prioritizes privacy, modularity, and developer usability while maintaining compatibility with existing EVM tooling and workflows.
