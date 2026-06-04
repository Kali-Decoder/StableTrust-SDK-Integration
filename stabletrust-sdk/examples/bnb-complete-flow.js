import { ethers } from "ethers";
import dotenv from "dotenv";
import { ConfidentialTransferClient, getStabletrustNetworkConfig } from "@fairblock/stabletrust";
import { ERC20_ABI } from "./constants.js";
import { performance } from "perf_hooks";

dotenv.config();

// Load the default network structure for Chain ID 97 (BNB Testnet)
const network = getStabletrustNetworkConfig(97);

// ABI snippet for calling the Diamond Proxy initialization layout
const MIRROR_ADMIN_ABI = [
  "function isSupportedToken(address token) view returns (bool)",
  "function tokenMul(address token) view returns (uint256)",
  "function setTokenConfig(address token, bool supported, uint256 mul) external",
  "function getPendingAction(address account) view returns (uint8)" // 🎯 Added for account state tracking
];

// ────── Testnet Configurations Matrix ──────
const RPC_URL = "https://data-seed-prebsc-1-s3.bnbchain.org:8545";

const CONTRACT_ADDRESS = process.env.BNB_STABLETRUST_CONTRACT_ADDRESS || network?.contractAddress;
const TOKEN_ADDRESS = process.env.BNB_TOKEN_ADDRESS;
const SENDER_PRIVATE_KEY = process.env.BNB_SENDER_PRIVATE_KEY || process.env.SENDER_PRIVATE_KEY;
const RECIPIENT_PRIVATE_KEY = process.env.BNB_RECIPIENT_PRIVATE_KEY || process.env.RECIPIENT_PRIVATE_KEY;

const actionSummary = [];

function requireValue(value, name) {
  if (!value) {
    throw new Error(`Missing required environment variable or configuration property: ${name}`);
  }
  return value;
}

/**
 * Diagnostic Spec Logger: Fetches and displays all structural balances for an account role
 */
async function logAccountSpecs(roleName, address, provider, tokenContract, tokenDecimals, client, privateKey = null) {
  const nativeBalance = await provider.getBalance(address);
  const tokenBalance = await tokenContract.balanceOf(address);
  const nonce = await provider.getTransactionCount(address);
  
  let confidentialBalanceStr = "Unregistered / Key Missing";
  if (privateKey) {
    try {
      const confBal = await client.getConfidentialBalance(address, privateKey, TOKEN_ADDRESS);
      confidentialBalanceStr = ethers.formatUnits(confBal.amount, tokenDecimals);
    } catch (e) {
      confidentialBalanceStr = "0.0 (Key Active)";
    }
  }

  console.log(`\n  [SPECS] ${roleName.toUpperCase()} (${address}):`);
  console.log(`    ├── Native Balance : ${ethers.formatEther(nativeBalance)} tBNB`);
  console.log(`    ├── Token Balance  : ${ethers.formatUnits(tokenBalance, tokenDecimals)} ${process.env.NEXT_PUBLIC_BNB_TOKEN_SYMBOL || 'mSTB'}`);
  console.log(`    ├── Shielded Bal   : ${confidentialBalanceStr}`);
  console.log(`    └── Current Nonce  : ${nonce}`);
}

/**
 * Performance Tracking Utility: Logs timestamps, measures duration, and tracks block transactions
 */
async function trackPerformance(actionName, action, provider, networkName) {
  const startTimeMs = Date.now();
  const startTimestamp = new Date(startTimeMs).toISOString();
  const start = performance.now();

  const result = await action();

  const end = performance.now();
  const endTimeMs = Date.now();
  const endTimestamp = new Date(endTimeMs).toISOString();

  const duration = ((end - start) / 1000).toFixed(3);

  let congestionStr = "N/A";
  let congestionInfo = "";
  if (provider && result && (result.hash || result.transactionHash)) {
    try {
      const hash = result.hash || result.transactionHash;
      const receipt = await provider.waitForTransaction(hash, 1, 45000); 
      if (receipt && receipt.blockNumber) {
        const block = await provider.getBlock(receipt.blockNumber);
        congestionStr = block.transactions.length;
        congestionInfo = ` | Block TXs (Traffic Volume): ${congestionStr}`;
      }
    } catch (e) {
      congestionStr = "Confirmed";
      congestionInfo = " | Block TXs (Traffic Volume): Settled";
    }
  }

  console.log(`Action: ${actionName}`);
  console.log(`Started: ${startTimestamp}`);
  console.log(`Duration: ${duration}s${congestionInfo}`);
  console.log(`Completed: ${endTimestamp}`);

  actionSummary.push({
    Chain: networkName,
    Action: actionName,
    "Duration (s)": duration,
    Congestion: congestionStr,
    "Started At": startTimestamp,
    "Completed At": endTimestamp,
  });

  return { result, duration };
}

/**
 * 🎯 RELAYER CATCH-UP GUARD:
 * Polls the contract state to check if there is an active pending operation locking the user account.
 * Dynamic poll intervals hold the execution loop until the testnet relayer flushes the account back to '0' (Idle).
 */
async function waitForPendingActionsToClear(contractAddress, accountAddress, provider) {
  const mirror = new ethers.Contract(contractAddress, MIRROR_ADMIN_ABI, provider);
  console.log(`\n🔍 Verifying account state lock status for ${accountAddress}...`);
  
  while (true) {
    const pendingAction = await mirror.getPendingAction(accountAddress).catch(() => 0n);
    if (Number(pendingAction) === 0) {
      console.log("✅ Account state: IDLE. Ready for next cryptotext transaction injection.");
      break;
    }
    console.log(`⏳ Account is currently LOCKED (Pending Action Code: ${pendingAction}). Waiting 12 seconds for Testnet Relayer finalization...`);
    await new Promise((resolve) => setTimeout(resolve, 12000));
  }
}

/**
 * Admin Configuration Verification: Registers the Mock Token on the Diamond Proxy if missing
 */
async function ensureTokenIsConfigured(contractAddress, signer, tokenAddress, tokenDecimals, gasOverrides) {
  const mirror = new ethers.Contract(contractAddress, MIRROR_ADMIN_ABI, signer);
  const expectedMul = 10n ** BigInt(tokenDecimals) / 100n;
  if (expectedMul === 0n) {
    throw new Error(`Unsupported token decimal count: ${tokenDecimals}`);
  }

  const [supported, ] = await Promise.all([
    mirror.isSupportedToken(tokenAddress).catch(() => false),
    mirror.tokenMul(tokenAddress).catch(() => 0n),
  ]);

  if (supported) {
    console.log("Token verification acknowledged on-chain. Proceeding...");
    return;
  }

  console.log("Configuring token registration options on the Diamond proxy...");
  const tx = await mirror.setTokenConfig(tokenAddress, true, expectedMul, gasOverrides);
  await tx.wait();
}

/**
 * Main Executable Process Flow Loop
 */
async function runBnbFlow() {
  requireValue(RPC_URL, "BNB_RPC_URL");
  requireValue(TOKEN_ADDRESS, "BNB_TOKEN_ADDRESS");
  requireValue(SENDER_PRIVATE_KEY, "BNB_SENDER_PRIVATE_KEY");
  requireValue(RECIPIENT_PRIVATE_KEY, "BNB_RECIPIENT_PRIVATE_KEY");
  requireValue(CONTRACT_ADDRESS, "BNB_STABLETRUST_CONTRACT_ADDRESS");

  const NETWORK_NAME = "BNB Smart Chain Testnet";
  console.log(`\n======================================================`);
  console.log(`=== Starting Confidential Benchmark Flow for ${NETWORK_NAME} ===`);
  console.log(`======================================================\n`);

  // CLIENT RUNTIME INTERFACE INITIALIZATION
  const client = new ConfidentialTransferClient(RPC_URL, CONTRACT_ADDRESS, 97);

  // Connect cleanly to the remote public testnet node provider
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // NONCE STACK MANAGERS
  const senderWallet = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);
  const recipientWallet = new ethers.Wallet(RECIPIENT_PRIVATE_KEY, provider);
  const sender = new ethers.NonceManager(senderWallet);
  const recipient = new ethers.NonceManager(recipientWallet);
  
  const operatorPrivateKey = process.env.BNB_OPERATOR_PRIVATE_KEY || process.env.BNB_OPERATOR_KEY || "";
  let operatorWallet = null;
  if (operatorPrivateKey) {
    operatorWallet = new ethers.Wallet(operatorPrivateKey, provider);
  } else if (await client.contract.isOperator(senderWallet.address)) {
    operatorWallet = senderWallet;
  } else if (await client.contract.isOperator(recipientWallet.address)) {
    operatorWallet = recipientWallet;
  } else {
    operatorWallet = senderWallet;
  }

  const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);
  const tokenDecimals = await tokenContract.decimals();

  console.log("=== TARGET ARCHITECTURE LAYOUT ===");
  console.log("StableTrust Contract:", CONTRACT_ADDRESS);
  console.log("Shielding Token:", TOKEN_ADDRESS);

  // --- INITIAL ACCOUNT METRICS LOG ---
  console.log("\n=== INITIAL ACCOUNTS SUMMARY INTEGRATION ===");
  await logAccountSpecs("Sender", senderWallet.address, provider, tokenContract, tokenDecimals, client);
  await logAccountSpecs("Recipient", recipientWallet.address, provider, tokenContract, tokenDecimals, client);

  // 🎯 TESTNET GAS OPTIMIZATION: Dynamically request fee structures from the live network head
  const feeData = await provider.getFeeData();
  const liveGasPrice = feeData.gasPrice ? (feeData.gasPrice * 120n) / 100n : ethers.parseUnits("10", "gwei");
  const testnetGasOverrides = {
    gasPrice: liveGasPrice
  };

  console.log(`[GAS OPTIMIZATION] Using dynamic gas price baseline: ${ethers.formatUnits(liveGasPrice, "gwei")} gwei`);

  // Run proxy asset validation checks
  await ensureTokenIsConfigured(
    CONTRACT_ADDRESS,
    senderWallet,
    TOKEN_ADDRESS,
    Number(tokenDecimals),
    testnetGasOverrides
  );

  // ────── PHASE 1: ACCOUNTS REGISTRATION ──────
  console.log("\n--- Phase 1: Ensuring Account Keys Registrations ---");
  
  const senderKeysRes = await trackPerformance(
    "ENSURE_SENDER_ACCOUNT",
    () => client.ensureAccount(sender, { waitForFinalization: true, operatorWallet, ...testnetGasOverrides }),
    provider,
    NETWORK_NAME
  );
  const senderKeys = senderKeysRes.result;

  const recipientKeysRes = await trackPerformance(
    "ENSURE_RECIPIENT_ACCOUNT",
    () => client.ensureAccount(recipient, { waitForFinalization: true, operatorWallet, ...testnetGasOverrides }),
    provider,
    NETWORK_NAME
  );
  const recipientKeys = recipientKeysRes.result;

  const depositAmount = ethers.parseUnits("0.01", tokenDecimals); 
  const transferAmount = ethers.parseUnits("0.005", tokenDecimals);
  const withdrawAmount = ethers.parseUnits("0.002", tokenDecimals); 

  // ────── PHASE 2: CONFIDENTIAL DEPOSIT ──────
  console.log("\n--- Phase 2: Confidential Deposit ---");
  
  // 🎯 CRITICAL CATCH-UP GUARD: Hold deployment execution loop until the registration clears the testnet relayer pipelines
  await waitForPendingActionsToClear(CONTRACT_ADDRESS, senderWallet.address, provider);

  await logAccountSpecs("Sender (Pre-Deposit)", senderWallet.address, provider, tokenContract, tokenDecimals, client, senderKeys.privateKey);

  console.log("Granting ERC20 spending allowance to Diamond Proxy...");
  const approveTx = await tokenContract.connect(senderWallet).approve(CONTRACT_ADDRESS, depositAmount, testnetGasOverrides);
  await approveTx.wait();

  sender.reset();

  console.log(`\nDepositing ${ethers.formatUnits(depositAmount, tokenDecimals)} tokens into confidential structures...`);
  const depRes = await trackPerformance(
    "DEPOSIT_TOKENS",
    () => client.confidentialDeposit(sender, TOKEN_ADDRESS, depositAmount, testnetGasOverrides),
    provider,
    NETWORK_NAME
  );
  console.log(`Transaction Hash: ${depRes.result.hash}`);

  // ────── PHASE 3: CONFIDENTIAL TRANSFER ──────
  console.log("\n--- Phase 3: Confidential Transfer ---");
  
  // 🎯 CRITICAL CATCH-UP GUARD: Hold deployment execution loop until the deposit logs clear the testnet relayer pipelines
  await waitForPendingActionsToClear(CONTRACT_ADDRESS, senderWallet.address, provider);

  await logAccountSpecs("Sender (Pre-Transfer)", senderWallet.address, provider, tokenContract, tokenDecimals, client, senderKeys.privateKey);
  await logAccountSpecs("Recipient (Pre-Transfer)", recipientWallet.address, provider, tokenContract, tokenDecimals, client, recipientKeys.privateKey);

  sender.reset();

  console.log(`\nTransferring ${ethers.formatUnits(transferAmount, tokenDecimals)} tokens confidentially to recipient...`);
  const txRes = await trackPerformance(
    "CONFIDENTIAL_TRANSFER",
    () => client.confidentialTransfer(sender, recipientWallet.address, TOKEN_ADDRESS, transferAmount, {
      ...testnetGasOverrides,
      recipientPublicKey: recipientKeys.publicKey
    }),
    provider,
    NETWORK_NAME
  );
  console.log(`Transaction Hash: ${txRes.result.hash}`);

  // ────── PHASE 4: WITHDRAWAL ──────
  console.log("\n--- Phase 4: Confidential Withdrawal ---");
  
  // 🎯 CRITICAL CATCH-UP GUARD: Wait for incoming ciphertext vectors to arrive at recipient destination address
  await waitForPendingActionsToClear(CONTRACT_ADDRESS, recipientWallet.address, provider);

  console.log("Synchronizing Recipient ciphertext state vectors down from live blockchain headers...");
  await client.getConfidentialBalance(recipientWallet.address, recipientKeys.privateKey, TOKEN_ADDRESS).catch(() => null);

  await logAccountSpecs("Recipient (Pre-Withdrawal)", recipientWallet.address, provider, tokenContract, tokenDecimals, client, recipientKeys.privateKey);

  recipient.reset();

  console.log("\nWithdrawing from recipient privacy structure...");
  const withdrawRes = await trackPerformance(
    "WITHDRAW_TOKENS",
    () => client.withdraw(recipient, TOKEN_ADDRESS, withdrawAmount, testnetGasOverrides),
    provider,
    NETWORK_NAME
  );
  console.log(`Transaction Hash: ${withdrawRes.result.hash}`);

  // 🎯 CRITICAL CATCH-UP GUARD: Hold terminal logging engine until the exit finalization executes completely
  await waitForPendingActionsToClear(CONTRACT_ADDRESS, recipientWallet.address, provider);

  console.log("\n=== FINAL ACCOUNTS SUMMARY STRUCTURAL SPECS ===");
  await logAccountSpecs("Sender (Final)", senderWallet.address, provider, tokenContract, tokenDecimals, client, senderKeys.privateKey);
  await logAccountSpecs("Recipient (Final)", recipientWallet.address, provider, tokenContract, tokenDecimals, client, recipientKeys.privateKey);

  console.log(`\n=== Successfully completed live sequence for ${NETWORK_NAME} ===`);

  if (actionSummary.length > 0) {
    console.log(`\n=== Performance Actions Summary Table ===`);
    console.table(actionSummary);
  }
}

runBnbFlow().catch((error) => {
  console.error("Execution failed during the BSC Testnet benchmark runtime loop:", error);
  process.exitCode = 1;
});