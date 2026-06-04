# Limitations

## Not Production Ready
- The demo depends on local dev infrastructure, not hardened production services.
- Deployment, relayer setup, and config syncing are still manual.
- Secrets are loaded from environment variables and local storage for convenience.

## Simplifications
- The ERC-20 is a mock token.
- The demo assumes BNB Smart Chain Testnet and one primary flow.
- The UI caches confidential keys in the browser for the current wallet.
- Relayer recovery is manual if checkpoints or pending actions get stuck.

## Privacy Reality
- Encrypted: confidential balances, transfer amounts, and confidential state transitions.
- Visible on-chain: wallet addresses, tx hashes, gas, timestamps, and activity timing.
- This hides amounts, not wallet identity or transaction metadata.

## Current Gaps
- Better relayer retries and monitoring.
- Clearer error reporting for ABI and callback mismatches.
- Automated setup for contracts, FairyPort, and frontend env vars.
- Cleaner support for multiple tokens and multiple chains.

## Known Blockers Observed
- FairyPort WebSocket disconnects on BNB testnet.
- Old relayer checkpoints replaying stale actions.
- Pending-action sync errors after partial finalization.
- Confidential transfer verification failures on some BNB testnet runs.
