# StableTrust Integration Notes: BNB Smart Chain Testnet Deployed System

## Overview

This document logs the core engineering observations, breaking points, architectural design choices, and runtime behaviors encountered during the end-to-end integration of the StableTrust privacy-preserving payment infrastructure on the **BNB Smart Chain Testnet (Chain ID: 97)**. It serves as both a post-mortem and an operational playbook for subsequent development phases.

---

## What Worked Fast

* **Sovereign Devnet Orchestration:** The underlying privacy execution layer (`Fairyring`) initialized predictably using the standard `make devnet-up` harness. The localized environment maintained clean block production baselines and state isolation throughout tests.
* **Smart Contract Structuring:** Deploying the multi-facet Diamond contract architecture alongside mock utility assets (`mSTB`) via Foundry scripts proved to be a smooth process. The standard EVM facet separation model allowed for straightforward integration on top of the testnet infrastructure.
* **SDK Protocol Bootstrapping:** The client-side SDK connected easily to remote network endpoints. It managed signatures and generated valid deterministic user public keys out-of-the-box, without requiring complex client-side setups or external dependencies.

---

## Technical Friction Points & Investigations

### 1. Deployment and ABI Sync

The system experienced a breaking point when the relayer engine (`FairyPort`) failed to decode the on-chain data vector structure from the Diamond contract. This was caused by an ABI mismatch between the local relayer configurations and the smart contract's transaction layout modifications.

* **Resolution:** Centralized the ABI schemas into a single compilation module and established automated script tests to enforce end-to-end schema validation before starting the nodes.

### 2. Ephemeral State Loss

During local development spikes, restarting the node context dropped the deployed bytecode maps, while the local browser environment continued trying to execute calls against the stale target address cache. This caused unhandled `empty-bytecode` read exceptions within the client's execution threads.

* **Resolution:** Implemented explicit bytecode presence checks inside the system's initialization scripts to force a clean runtime error before execution begins.

### 3. Pacing Violations and Relayer Lag

When transactions were executed in quick succession without pacing guards, the system threw frequent `execution reverted: "pending action"` errors. This occurred because consecutive transactions were fired before the decentralized testnet relayer could finish processing the previous state mutation and reset the account's lock status back to an idle state (`Code 0`).

* **Resolution:** Migrated the frontend flow away from manual transaction delay blocks and instead leveraged the client library's built-in block-pacing engine (`_waitForGlobalState`) to safely coordinate actions with the network's actual settlement speed.

---

## Core SDK and Interface Design Patterns

### Protocol Layer Separation

All low-level protocol rule validations, raw key derivations, plaintext mutations, and zero-knowledge mathematical variables are kept entirely inside the client SDK wrapper. The user interface acts purely as an asynchronous rendering layout, protecting it from protocol-heavy execution mechanics.

### Single-Client Client Integration

Instead of building a separate, standalone wallet router class for this implementation, the integration hooks directly into the existing `ConfidentialTransferClient` architecture. It extends its core parameters by passing explicit target configuration options such as:

```typescript
const client = new ConfidentialTransferClient(config.rpcUrl, config.contractAddress, config.chainId);

```

### Security Framework for Client Keys

Derived cryptographic private keys (`st_conf_pk_`) are cached locally within the browser session context (`localStorage`). This approach provides a smooth user experience across page reloads without exposing sensitive parameters to external hosting backends or cloud database clusters.

---

## Infrastructure and Runtime Stability

### Node and RPC Stability

Public BNB Testnet RPC endpoints were the primary source of runtime instability, frequently dropping active WebSocket subscriptions and exhibiting stale block checkpoint synchronization issues.

* **Mitigation Strategy:** Configured the `JsonRpcProvider` parameters with static network flags and high retry thresholds (`cacheTimeout: -1`, `staticNetwork: true`) to minimize network connection errors.

### Dynamic Gas Pricing Integration

Static, hardcoded gas boundaries frequently resulted in dropped transactions or out-of-gas errors due to the variable gas baselines on the public testnet.

---

## Strategic System Improvements

### Recommended SDK Enhancements

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Proposed SDK Extensions                         │
├────────────────────────────────────────────────────────────────────────┤
│  1. Built-in Sanity Checks (Validate Contract/Chain ID alignment)      │
│  2. Lightweight BNB Sandbox Utility Helper                             │
│  3. Relayer Queue Telemetry Interface                                  │
│  4. Automated Native Key Derivation Hook Lifecycle                     │
└────────────────────────────────────────────────────────────────────────┘

```

* **Automated Configuration Sanity Checks:** Introduce an internal validation check during client initialization that actively queries the target chain to verify that the deployed contract address matches the client's `chainId` parameters, throwing clear errors if a mismatch is detected.
* **Opinionated Utility Helpers:** Ship a lightweight, pre-configured sandbox helper specifically tailored for the BNB ecosystem to reduce the initial boilerplate needed for new environment integrations.
* **Relayer Queue Telemetry:** Expose clean tracking properties on the client instance to give developers real-time insight into the relayer queue status (`info.pendingAction`) without requiring custom contract calls.
* **Automated Hook Lifecycle:** Integrate the account key derivation flow directly into the wallet connection lifecycle to eliminate the need for manual cache state syncs inside the UI application layer.

### Recommended Onboarding Paths for New Integrators

* **Unified Bootstrapping Script:** Build a single-command setup script (e.g., `npm run stabletrust:init`) that automatically clones the required system repositories, compiles the required smart contracts, pulls down the latest container images, and spins up the local environment.
* **Unified Configuration Profile:** Replace distributed environment variables with a single, unified configuration file (`stabletrust.config.json`) to manage all smart contract deployments, gas parameters, and RPC paths.
* **Stale State Remediation Controls:** Provide explicit recovery tools within the integration utility suite to clear stale relayer states and handle contract address mutations seamlessly during development iterations.
* **Pre-Flight Verification Suite:** Deliver a strict integration checklist tool to verify system health across endpoints, ABI mappings, and gas funding balances before executing privacy-preserving asset transactions.