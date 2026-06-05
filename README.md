
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
# StableTrust Multi-Facet Proxy Target Deployed on BNB Testnet
BNB_STABLETRUST_CONTRACT_ADDRESS=0x63bF1207C75060b303f2895574584700d53988ac

# mSTB Target Token Contract for Balance Shielding Simulation
BNB_TOKEN_ADDRESS=0xC915876c59f8A902bE7E67cAce5083fb7d790ECe

# Account #1 Private Key (Alice - Sender)
BNB_SENDER_PRIVATE_KEY=your_alice_private_key_here

# Account #2 Private Key (Bob - Recipient)
BNB_RECIPIENT_PRIVATE_KEY=your_bob_private_key_here

```

### Frontend Client Environment Layer (`.env.local`)

```env
NEXT_PUBLIC_PRIVY_APP_ID=cmajw2fnd01yqk40ljgeestbk
PRIVATE_KEY=your_faucet_wallet_private_key_here
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

## Running & Testing Locally

Ensure your environment configuration files are populated before executing any tests or running the application.

### 0. Start the Relayer Infrastructure (Prerequisite)

For **any** testing workflow—whether executing the terminal Node.js scripts or using the browser frontend—the decentralized relayer bridge must be active to process the split-phase state transitions between the EVM chain and the Fairyring ledger.

From your local `fairyport` workspace directory, spin up the relayer module:

```bash
fairyport run -c ./fairyport.config.yaml

```

### 1. Command-Line Interface (CLI) End-to-End Test

Make sure your `.env` parameters inside `stabletrust-sdk` are correctly filled with valid private keys. Then, run the automated complete confidential lifecycle:

```bash
# Navigate to the SDK workspace directory
cd stabletrust-sdk

# Install workspace dependencies
npm install

# Run the complete automated benchmark flow
node examples/bnb-complete-flow.js

```

### 2. Frontend User Interface (UI) Dashboard

To launch the interactive Next.js web application sandbox locally to test live account switching, network shifting, and visual step-by-step onboarding, run the following commands:

```bash
# Navigate into the frontend workspace directory
cd app

# Install clean local node modules 
pnpm install

# Start the Next.js development server
pnpm run dev

```

Once the development server compiles, open your browser and navigate to **[http://localhost:3000](https://www.google.com/search?q=http://localhost:3000)**.

#### Local Testing Playbook (UI Verification):

1. **Wallet Connection:** Click **Access Sandbox** and connect your preferred browser extension (MetaMask / Rabby) using Privy.
2. **Network Switcher:** If your wallet is on an alternate chain, click the prominent **Switch to BNB Testnet** banner overlay to automatically shift to Chain ID `97`.
3. **Account Switching:** Open your wallet extension and swap to an alternate address. Notice the **Wallet Identity** indicator updates instantly, the native token balance re-fetches `tBNB`, and the interface cleanly prompts you to derive a fresh, isolated set of keys for the new identity.
4. **Local Key Cache:** Swap back to your original address; the application dynamically re-pulls your cached credentials from `localStorage`, seamlessly unlocking your private balance view without triggering redundant signature requests.

---

## Gas & Testing Tokens

* **Native Gas (`tBNB`):** Claim gas tokens directly via the official BNB Chain Testnet Faucet before attempting initialization transactions.
* **Utility Sandbox Assets (`mSTB`):** Use the integrated `Request Faucet` dashboard link inside the sandbox UI interface or call the Next.js `sendFaucet` server action to route token test mint allocations directly to your wallet.

---

## Integration & SDK Status Assessment

### 1. End-to-End Functional Status

* **CLI & Backend Suite:** Fully operational multi-phase pipeline (`examples/bnb-complete-flow.js`) executing sequential account registration, ERC-20 allowances, confidential deposits, private transfers, and zero-knowledge withdrawals directly on the BNB Smart Chain Testnet.
* **Frontend App Implementation:** Seamless interactive walkthrough dashboard mirroring the complete CLI lifecycle under a non-blocking UI environment.
* **Reactive Event Management:** Real-time wallet identity updates, account switching captures, dynamic token metadata parsing (`mSTB`), and asset balances normalized up to two decimal points.

### 2. Sandbox Constraints & Known Workarounds

* **Ephemeral State Polling:** The script and interface rely on the SDK's internal `_waitForGlobalState` tracking loop to safely pace transactions alongside the BNB Testnet relayer processing speed.
* **Local Key Persistence:** Leverages browser `localStorage` as a performance caching layer (`st_conf_pk_`) keyed to individual wallet addresses. This allows users to switch wallets back and forth seamlessly while prompting fresh cryptographic identity derivations only for new, unregistered keys.

### 3. SDK Change Assessment & Rationale

* **Target Network Configuration:** Centralized all blockchain fallbacks, contract facet addresses, and mock token routing endpoints directly inside the core SDK constants file to natively support BNB Chain Testnet (Chain ID: 97) parameters.
* **Asynchronous Execution Pacing:** Forced transaction methods to process using `{ waitForFinalization: false }`. This approach hands off lifecycle block verification loops cleanly to the frontend loading manager, keeping UI interaction responsive.
* **Address & Chain Swap Reactive Listeners:** Added native account change and network protection layers into the core client hook. This configuration blocks invalid RPC queries on wrong networks, routes native chain switching through Privy, and instantly resets user keys when an alternate wallet is selected in the browser extension.

---

## Submission Artifacts

* **Repository Link:** [StableTrust SDK Integration](https://github.com/Kali-Decoder/StableTrust-SDK-Integration.git)
* **Final Commit Hash:** `7b557973a8fd8e04bfb8f0a273d98769db5cb67d`
* **Demonstration Video Materials:** [Google Drive Folder Walkthrough](https://drive.google.com/drive/folders/1eKwNV8FnRlGtF8JDX2h7_Go5BvXI5jEO?usp=sharing)

