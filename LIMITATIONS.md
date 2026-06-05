# Limitations and Project Constraints

## Operational Readiness Status

* **Infrastructure Isolation:** The current software stack targets internal sandbox development frameworks. It does not contain the multi-layered security protections, high-availability consensus rules, or edge network distribution nodes required for production deployments.
* **Manual Deployment Lifecycle:** Provisioning network nodes, linking independent relayer topologies, and synchronizing system contract configurations require manual, step-by-step developer scripts. The architecture lacks automated container configuration management tools or orchestrators.
* **Credentials Security Framework:** Cryptographic private keys and platform authorization tokens are loaded from plaintext parameters inside environment variables and browser session stores (`localStorage`). This architecture is optimized for sandbox simplicity rather than production-grade secret management infrastructure.

---

## Architectural Simplifications & Scope Bounds

* **Mock Asset Dependence:** Account operations are executed exclusively against an unbacked mock utility token configuration ($mSTB$). The implementation does not include deep liquidity routing pathways, real-time oracle price feeds, or dynamic cross-token slippage calculation engines.
* **Deterministic Network Mapping:** The client library and web components are configured to target a single environment profile running on the **BNB Smart Chain Testnet (Chain ID: 97)**. It does not include support for multi-chain routing or atomic multi-asset settlements.
* **Client Key Persistency Model:** Derived encryption private key pairs are cached directly inside the browser's local state vectors. While this design prevents continuous wallet signature prompts, it binds user visibility to a single physical device session and increases vulnerability to client-side data wipes.
* **Manual State Queue Intervention:** The backend pipeline lacks automated self-healing mechanisms. If a transaction queue locks up or a relayer node drops offline, resolving the stale state requires manual database clearance and contract reset interventions.

---

## Cryptographic Privacy Realities & Leakage Boundaries

The platform separates encrypted state parameters from public transaction metadata. While it provides strict financial asset confidentiality, it does not provide complete structural on-chain anonymity.

```
┌───────────────────────────────────────┐   ┌───────────────────────────────────────┐
│     CONFIDENTIAL (HIDDEN ON-CHAIN)    │   │      VISIBLE (EXPOSED PUBLICLY)       │
├───────────────────────────────────────┤   ├───────────────────────────────────────┤
│ • Shielded Account Balances           │   │ • Source & Destination Addresses      │
│ • Exact Token Transaction Amounts     │   │ • Public Transaction Hashes           │
│ • State Transition Input Parameters   │   │ • Native Gas Consumption Metrics      │
│ • Fairyring Internal Ledger Changes   │   │ • Exact Block Timestamps              │
└───────────────────────────────────────┘   └───────────────────────────────────────┘

```

> **Critical Privacy Note:** The zero-knowledge execution design hides exactly *how much* value was moved during an transaction, but public ledger observers can still trace *who* interacted with the contract and *when* the transaction occurred.

---

## Current Engineering Gaps & Development Tasks

* **Relayer Fault Tolerance Loops:** The relayer architecture contains basic fallback handling. It lacks robust connection retry logic, automated transaction speed management, or real-time performance logging dashboards.
* **Schema Consistency Assertions:** The execution framework lacks runtime sanity checks to catch contract updates. An ABI or interface mismatch between the contract facets and the relayer will cause silent decoding failures instead of throwing a clear error.
* **Integrated Bootstrap Orchestration:** Setting up the codebase requires running separate scripts across three distinct environments. There is currently no unified configuration manager to automatically provision contracts, align the relayer checkpoints, and write the matching environment parameters down to the frontend components.
* **Multi-Tenant Ledger Extensions:** The structural state arrays are designed around a single target asset profile. Significant refactoring would be required to support parallel token pools, mixed decimal scales, or cross-chain state bridges.

---

## Identified Production Blockers

* **WebSocket Connection Drops:** The relayer engine (`FairyPort`) experiences frequent connection dropouts when maintaining long-lived WebSocket connections with public BNB Testnet RPC endpoints, causing transaction processing delays.
* **Stale Checkpoint Replay Events:** If a relayer node is abruptly restarted, its checkpoint tracking files can fall out of sync, causing the engine to replay processed events and trigger transaction failures on-chain.
* **Partial Finalization Deadlocks:** If an execution thread fails during the second phase of a transaction lifecycle, the target wallet address can get stuck in a permanently locked state (`pendingAction > 0`), requiring manual database intervention to fix.
* **Intermittent Cryptographic Verification Failures:** The zero-knowledge proof verification pipeline experiences intermittent calculation errors during high-congestion blocks on the BNB Testnet, resulting in occasional unhandled transaction rollbacks.