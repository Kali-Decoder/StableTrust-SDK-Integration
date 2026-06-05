Here is the clean, production-ready update for your project `README.md`. It centralizes all configurations around the **BNB Smart Chain Testnet**, integrates the updated scripts, highlights your frontend optimization parameters, and keeps the language looking completely non-AI generated.

```markdown
# StableTrust + Fairyring Sandbox Demo

This repository contains an end-to-end sandbox implementation demonstrating multi-phase confidential transactions running on the **BNB Smart Chain Testnet (Chain ID: 97)**. It uses a split-phase asynchronous commitment lifecycle to hide transaction values and ledger states without modifying base-layer protocol mechanics.

### Core Implementation Components
- **Fairyring:** Dedicated execution layer for confidential accounting states.
- **FairyPort:** Bi-directional relayer coordination bridge mapping EVM log states to Fairyring.
- **Confidential Mirror Diamond:** Multi-facet public EVM contract state tracking address mutations.
- **StableTrust SDK + UI Task:** Client-side interface wrapper utilizing WebAssembly for local proof generation.

---

## Technical Features

- **Account Lifecycle Automation:** Native public/private identity derivation via wallet signature primitives without seed word storage.
- **Optimized Non-Blocking Execution:** Asynchronous transaction pipelines running `{ waitForFinalization: false }` to preserve responsive frontend thread operations.
- **Reactive Wallet Sync:** Event hooks listening directly to browser wallet adjustments (`accountsChanged`) to wipe session parameters and match newly exposed signers dynamically.
- **Dynamic Network Protection Guard:** Client-side routing barriers that flag network mismatches and handle single-click redirection back to the target network parameters.
- **Shortened Identity Mapping:** Responsive component views truncating address structures and bounding asset balance updates cleanly up to two decimal scales.

---

## Prerequisites

- **Node.js:** `20+`
- **npm:** `10+`
- **Go:** `1.22+`
- **Rust Toolchain:** Activated with target `wasm32-unknown-unknown`
- **Foundry Tooling Suite:** (`forge` + `anvil`)
- **Gas Provisioning:** An active Web3 provider wallet containing testnet `tBNB` funds.

---

## Project Structure Matrix


```

.
├── app/                      # Next.js Front-End Client Web Application Shell
│   ├── actions/              # Server Actions for RPC mappings and Faucet routing
│   ├── components/           # Custom UI panels (FluidLoader, LoginPage)
│   ├── hooks/                # State coordination hooks (useConfidentialClient)
│   └── Onboarding.tsx        # Step-by-step cryptographic walkthrough interface
├── stabletrust-sdk/          # Low-level contract interactions & proof generators
│   ├── src/                  # Core SDK codebase
│   └── examples/             # Streamlined backend benchmark performance runner scripts
└── README.md

```

---

## Environment Configuration

### SDK / Scripts Environment Layer (`.env`)
```env
SENDER_PRIVATE_KEY=0x...
RECIPIENT_PRIVATE_KEY=0x...
BNB_TOKEN_ADDRESS=0xC915876c59f8A902bE7E67cAce5083fb7d790ECe
BNB_STABLETRUST_CONTRACT_ADDRESS=0x63bF1207C75060b303f2895574584700d53988ac

```

### Frontend Client Environment Layer (`.env.local`)

```env
NEXT_PUBLIC_APP_ENV=testnet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_BNB_RPC_URL=[https://data-seed-prebsc-1-s3.bnbchain.org:8545](https://data-seed-prebsc-1-s3.bnbchain.org:8545)
NEXT_PUBLIC_BNB_STABLETRUST_CONTRACT_ADDRESS=0x63bF1207C75060b303f2895574584700d53988ac
NEXT_PUBLIC_BNB_TOKEN_ADDRESS=0xC915876c59f8A902bE7E67cAce5083fb7d790ECe
NEXT_PUBLIC_BNB_TOKEN_SYMBOL=mSTB
NEXT_PUBLIC_BNB_EXPLORER_URL=[https://testnet.bscscan.com/tx/](https://testnet.bscscan.com/tx/)

```

---

## Step-by-Step Deployment Flow

1. **Spin up Fairyring Devnet Infrastructure:**
```bash
make devnet-up

```


<<<<<<< HEAD
2. **Compile and Deploy CosmWasm Structures:**
Target your local contract build parameters and instantiate them inside the Fairyring context.
3. **Deploy EVM Settlement Contracts:**
Deploy the mock token asset (`mSTB`) and the multi-facet Diamond smart contract to the BNB Chain Testnet via your local Foundry compilation environment.
4. **Synchronize Relayer Mappings:**
Open your localized `fairyport/fairyport.config.yaml` layout profile and paste the deployed Diamond and mock token addresses into the mapping fields.
5. **Initialize FairyPort Node:**
Launch the relayer binary to begin monitoring the host network and routing event cycles.
6. **Execute Scripted Benchmark Runner:**
To test the asynchronous core flow from the terminal without the frontend, execute:
```bash
node examples/bnb-complete-flow.js

```


7. **Launch the Web Dashboard Interface:**
Install dependencies and boot up the Next.js client development server:
```bash
npm install
npm run dev

```



---

## Gas & Testing Tokens

* **Native Gas (`tBNB`):** Claim gas tokens directly via the official BNB Chain Testnet Faucet before attempting initialization transactions.
* **Utility Sandbox Assets (`mSTB`):** Use the integrated `Request Faucet` dashboard link inside the sandbox UI interface or call the Next.js `sendFaucet` server action to route token test mint allocations directly to your wallet.

---

## Submission Artifacts

* **Repository Link:** [StableTrust SDK Integration](https://github.com/Kali-Decoder/StableTrust-SDK-Integration.git)
* **Final Commit Hash:** `replace_with_your_submitted_commit_hash`
* **Demonstration Video Materials:** [Google Drive Folder Walkthrough](https://drive.google.com/drive/folders/1eKwNV8FnRlGtF8JDX2h7_Go5BvXI5jEO?usp=sharing)


