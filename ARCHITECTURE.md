# StableTrust: Privacy-Preserving Asset & Payment Infrastructure

## Overview

StableTrust is a low-latency, privacy-preserving asset routing and ledger platform built to manage confidential transactions across EVM-compatible ecosystems. By combining a zero-knowledge execution environment with specialized decentralized relayers, the system obfuscates sensitive metadata—including account balances and transaction amounts—while maintaining trust assumptions and cryptographic validity on public ledgers.

The implementation acts as a turnkey programmatic sandbox deployed on the **BNB Smart Chain Testnet (Chain ID: 97)**. It demonstrates frictionless institutional confidentiality without requiring native modifications to the host execution environment or manual key generation steps for end-users.

---

## System Architecture Layout

The platform uses a modular layout that separates the underlying confidential accounting engine, the public multi-tenant smart contract state, and client-side proof generation layers.

```
┌─────────────────────────────────┐          ┌──────────────────────────────────┐
│          Fairyring              │◄─────────┤            FairyPort             │
│   (Confidential State Engine &  │          │   (Bi-Directional Relayer Engine │
│      Encrypted Accounting)      │─────────►│     Event Watcher & Finalizer)   │
└─────────────────────────────────┘          └────────────────┬─────────────────┘
                                                              │
                                                              │ Posts Finalization
                                                              ▼
┌─────────────────────────────────┐          ┌──────────────────────────────────┐
│      StableTrust Web UI         │          │    Confidential Mirror Diamond   │
│   (React Hooks + Live Metrics)  │          │    (EVM Public Contract State,   │
│                │                │          │    Pending Queues & Asset Proxy) │
└────────────────┼────────────────┘          └────────────────▲─────────────────┘
                 │                                            │
                 │ Invokes Transactions & Proofs              │
                 └────────────────────────────────────────────┘

```

### Core Architecture Components

* **Fairyring (Confidential Execution Layer):** A dedicated, privacy-focused sovereign state machine running encrypted accounting logic. It processes encrypted payload data (ciphertext vectors), tracks off-chain user asset state boundaries, and executes deterministic transitions without exposing the inner unencrypted plaintexts to validator nodes.
* **FairyPort (Relayer Coordination Engine):** An asynchronous, automated coordination layer that runs continuous bi-directional polling loops between the host EVM network and Fairyring. It listens to public contract event logs, packages and maps those instructions into valid raw messages for Fairyring, and submits the finalized cryptographic responses back to the EVM network.
* **Confidential Mirror Diamond (EVM Settlement Layer):** An EIP-2535 Diamond Proxy multi-facet smart contract layout deployed on the target EVM network. It stores non-sensitive transaction state information, handles dynamic ERC-20 spending approvals, manages multi-token configuration entries, and hosts the strict account status tracking maps (`getPendingAction`) that serialize address mutations.
* **StableTrust Client SDK + Frontend Client Application:** A unified client library and interface wrapper designed for application developers. It handles deterministic public/private key derivation locally, interacts directly with the public contract facets, builds localized cryptographic inputs for zero-knowledge proofs, and displays real-time state transitions to users.

---

## Lifecycle & Transaction Execution Flow

The platform separates transaction execution into a split-phase commitment lifecycle. To keep user interfaces responsive, transactions on the EVM host ledger occur asynchronously from final balance reconciliation.

```
User Action     EVM Diamond Contract       FairyPort Relayer        Fairyring Privacy Engine
    │                     │                        │                           │
    │─── Emit Tx ────────►│                        │                           │
    │                     │─── Emit Pending Event ─►                           │
    │                     │                        │─── Submit Ciphertext ────►│
    │                     │                        │                           │ [State Transition]
    │                     │◄── Post Finalization ──┤◄── Return Output Vectors ─┤
    │                     │                        │                           │
    ▼                     ▼                        ▼                           ▼

```

### Step-by-Step Execution Sequence

1. **Client-Side Request Initialization:** The user triggers a state mutation (e.g., `ensureAccount`, `confidentialDeposit`, `confidentialTransfer`, or `withdraw`) via the React application interface.
2. **EVM Entry Commitment:** The client signs and broadcasts a transaction to the host Diamond proxy contract. The contract records the execution vector, transitions the user’s account flag to a locked status (setting an active `pendingAction` code), and emits an explicit tracking event log.
3. **Relayer Interception:** The `FairyPort` infrastructure picks up the newly emitted event log from the public blockchain headers. It extracts the encrypted state parameters (such as the target public keys or transaction ciphertext arguments) and forwards them as a structured message to `Fairyring`.
4. **Privacy Engine State Transition:** `Fairyring` verifies the message's signatures and cryptographic validity against its ledger. It executes the hidden accounting operation, computes the updated encrypted asset balances, and builds an authorized response payload.
5. **EVM Settlement Finalization:** `FairyPort` reads the signed compute response from the private engine and forwards it to the EVM host network by calling the Diamond contract's response facet (e.g., `createConfidentialAccountResponse`). The contract validates the submission, updates its internal accounting structures, and resets the target address's `pendingAction` flag back to an `IDLE` (`0`) state.
6. **Client Cache Interface Sync:** The client-side runtime application detects the account unlock notification, down-synchronizes the newly adjusted ciphertext balance records from the live block headers, and displays the updated balance details in the UI layout.

---

## Client SDK Modular Structure

The `@fairblock/stabletrust` client SDK is designed to keep protocol-heavy cryptographic engineering out of the application rendering loop.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      ConfidentialTransferClient                        │
├────────────────────────────────────────────────────────────────────────┤
│  Key Derivation   │   EVM Read/Write   │  WASM Proof Engine  │ Balance │
│  (_deriveKeys)    │   (ethers.js V6)   │  (generate_proof)   │ Manager │
└───────────────────┴────────────────────┴─────────────────────┴─────────┘

```

* **Deterministic Key Derivation Engine (`_deriveKeys`):** Derives an isolated ElGamal cryptographic keypair natively using the user's signature. By passing structured domain parameters (including the active `chainId` and the target `contractAddress`), the keypair remains deterministic across browser sessions without storing seed words on remote storage layers.
* **EVM Interaction Layer:** Built using `ethers.js (v6)` primitives to handle structural smart contract data routing. It handles public address verification, reads and decodes multi-facet variables from the Diamond architecture, monitors transaction nonces via an integrated `NonceManager`, and executes public ERC-20 spending approvals before invoking privacy deposit methods.
* **WebAssembly (WASM) Local Cryptographic Prover:** Loads localized zero-knowledge proof engines on-demand into the client runtime context (`initializeWasm`). It takes local private key data and transaction plaintexts to build valid transfer and withdrawal proof objects (`generate_transfer_proof` / `generate_withdraw_proof`), keeping unencrypted asset metrics entirely within client memory space.
* **Asynchronous State Tracking Manager (`_waitForGlobalState`):** Provides built-in block pacing controls that allow developers to coordinate frontend operations with the backend relayer. By configuring execution wrappers with the explicit flag `{ waitForFinalization: false }`, applications can offload block tracking loops directly to localized UI states, keeping the main thread free.

---

## Frontend Architecture Integration

The frontend client infrastructure is built as an interactive Next.js application designed to provide a real-time, sandbox-driven look at the platform's protocol layers.

### Frontend Component Directory

```
app/
├── actions/
│   ├── faucet.ts         # Server Action: Routes tBNB & mSTB testnet token claims
│   └── rpc.ts            # Server Action: Resolves valid node endpoint paths
├── components/
│   ├── FluidLoader.tsx   # Visual Feedback: Shows real-time state mutation steps
│   └── LoginPage.tsx     # Session Gate: Handles Privy onboarding flows
├── hooks/
│   └── useConfidentialClient.ts  # Core React State: Coordinates events and providers
├── Dashboard.tsx         # Primary Shell: Coordinates panels, states, and operations
├── Onboarding.tsx        # Interactive Tutorial: Steps through the standard wallet path
└── layout.tsx            # Global Entry: Registers fonts and global styles

```

### Core Execution Modules

* **State Coordination Hook (`useConfidentialClient`):** Centralizes the client application's wallet and network state tracking logic. It abstracts out account checks, aggregates public, confidential, and native gas balances into a single reactive structure, and sets up real-time token metadata mapping.
* **Reactive Account Switch Listener:** Hooks into the web3 connector layer to monitor the `accountsChanged` event stream directly from the browser's provider window object (`window.ethereum`). When a user switches accounts in their extension wallet (e.g., MetaMask or Rabby), the hook invalidates local active parameters, flushes the previous identity profile, and restores any cached keypairs matching the new address from local storage.
* **Dynamic Network Protection Guard:** Compares the wallet's reported network configuration (`wallets[0].chainId`) with the platform's target parameters (`Chain ID: 97`). If a network mismatch is detected, it blocks balance fetching loops to prevent node errors, updates the layout indicators, and surfaces an overlay with a single-click action to switch back to the correct chain via Privy.
* **Fluid Processing Indicator (`FluidLoader`):** An adaptive visual loading module that uses an internal mapping dictionary (`actionMessageMap`) to show users exactly where their transaction is in the multi-phase lifecycle (e.g., generating zero-knowledge proofs or waiting for the BNB relayer queue).

---

## Protocol Design Guidelines

1. **Core Cryptographic Separation:** All raw key derivation, unencrypted plaintext calculations, and zero-knowledge proof generation steps occur strictly inside the client-side WebAssembly environment. Unencrypted private data is never sent over public network channels or stored on centralized hosting servers.
2. **Ecosystem Rebranding Alignment:** The system defaults to an explicit single-chain configuration target tuned for the **BNB Smart Chain Testnet**. All native currency fields display gas values in `tBNB`, and token balances track the designated project privacy token (`mSTB`) across the interface layouts.
3. **Local Storage Security Framework:** Local browser storage mechanisms (`localStorage`) are used exclusively as a performance caching layer for user public keys and derived private constants (`st_conf_pk_`). This allows users to reconnect across web sessions without re-signing key generation requests. No user credentials, private keys, or wallet seed vectors are ever stored in remote cloud databases.
4. **Resilient Execution Pacing:** The interface relies on the smart contract's state attributes (`getPendingAction`) to manage transaction ordering. By tracking the contract's account lock indicators rather than arbitrary block timestamps, the application naturally aligns its execution pace with the network's throughput limits. This helps prevent race conditions and transaction collisions during periods of high network traffic.