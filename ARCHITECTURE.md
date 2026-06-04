# Architecture

## System Layout
- **Fairyring** holds the confidential state and runs the encrypted accounting logic.
- **FairyPort** watches EVM events, sends work to Fairyring, and posts finalization back.
- **Confidential Mirror Diamond** stores the public EVM-side state and pending actions.
- **StableTrust SDK + frontend** wrap the flow for app developers and users.

## Transfer Flow
1. The user calls `ensureAccount`, `deposit`, `confidentialTransfer`, or `withdraw`.
2. The Diamond writes a pending action on-chain.
3. FairyPort picks up that action and submits the matching Fairyring message.
4. Fairyring processes the confidential state change.
5. FairyPort reads the result and finalizes the EVM side.
6. The SDK refreshes balances and the UI shows the new state.

## SDK Structure
- `ConfidentialTransferClient` is the direct EVM client used by the demo.
- It derives deterministic keys per wallet, chain, and contract.
- It wraps account creation, deposits, transfers, withdrawals, and balance reads.
- WASM proof generation is loaded on demand for withdraw flows.

## Frontend Structure
- `ui-task` keeps wallet state, balances, and logs in React hooks.
- `StableTrustService` bridges the UI to the SDK and token contract.
- `ui-task/src/config/bnb.ts` centralizes the BNB testnet defaults.
- Confidential keys are cached in localStorage for the active wallet.

## Main Design Choices
- Keep protocol logic in the SDK instead of the UI.
- Use one explicit BNB testnet path for the demo.
- Favor clear recovery steps over hidden retries.
- Store only demo-friendly secrets locally, not in a remote backend.
