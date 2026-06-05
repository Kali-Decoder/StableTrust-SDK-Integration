import { ethers } from "ethers";
import dotenv from "dotenv";
import { ConfidentialTransferClient } from "@fairblock/stabletrust";
import { ERC20_ABI } from "./constants.js";
import { performance } from "perf_hooks";

dotenv.config();

const BNB_CHAIN = {
  network: "BNB Smart Chain Testnet",
  chainId: 97,
  tokenAddress: process.env.BNB_TOKEN_ADDRESS || "",
  contractAddress: process.env.BNB_STABLETRUST_CONTRACT_ADDRESS || "",
  rpcUrl: "https://data-seed-prebsc-1-s3.bnbchain.org:8545",
  explorerUrl: "https://testnet.bscscan.com/tx/",
};

const actionSummary = [];

// Simple helper to halt execution pacing
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function trackPerformance(actionName, action) {
  const start = performance.now();
  const startTimeMs = Date.now();

  const result = await action();

  const end = performance.now();
  const duration = ((end - start) / 1000).toFixed(3);

  console.log(`Action: ${actionName} | Duration: ${duration}s`);

  actionSummary.push({
    Action: actionName,
    "Duration (s)": duration,
    Timestamp: new Date(startTimeMs).toISOString(),
  });

  return result;
}

async function runBnbFlow() {
  console.log(`\n======================================================`);
  console.log(`=== Starting Confidential Flow for ${BNB_CHAIN.network} ===`);
  console.log(`======================================================\n`);

  const senderPrivateKey = process.env.SENDER_PRIVATE_KEY || process.env.BNB_SENDER_PRIVATE_KEY;
  const recipientPrivateKey = process.env.RECIPIENT_PRIVATE_KEY || process.env.BNB_RECIPIENT_PRIVATE_KEY;

  if (!senderPrivateKey || !recipientPrivateKey) {
    throw new Error("Missing SENDER_PRIVATE_KEY or RECIPIENT_PRIVATE_KEY in .env");
  }

  const provider = new ethers.JsonRpcProvider(BNB_CHAIN.rpcUrl);
  const sender = new ethers.Wallet(senderPrivateKey, provider);
  const recipient = new ethers.Wallet(recipientPrivateKey, provider);

  const client = new ConfidentialTransferClient(BNB_CHAIN.rpcUrl, BNB_CHAIN.contractAddress, BNB_CHAIN.chainId);
  const tokenContract = new ethers.Contract(BNB_CHAIN.tokenAddress, ERC20_ABI, provider);
  const tokenDecimals = await tokenContract.decimals();

  console.log("Sender Address:", sender.address);
  console.log("Recipient Address:", recipient.address);

  // ─── Phase 1: Account Registration ───
  console.log("\n--- Phase 1: Registration ---");
  console.log("⏱️ Waiting 10 seconds before account registration...");
  // await delay(10000);

  await trackPerformance("ENSURE_SENDER_ACCOUNT", () => client.ensureAccount(sender, { waitForFinalization: true }));
  await trackPerformance("ENSURE_RECIPIENT_ACCOUNT", () => client.ensureAccount(recipient, { waitForFinalization: true }));

  // ─── Phase 2: Confidential Deposit ───
  console.log("\n--- Phase 2: Deposit ---");
  console.log("⏱️ Waiting 10 seconds before initiating deposit flow...");
  // await delay(10000);

  const depositAmount = ethers.parseUnits("0.1", tokenDecimals);
  
  console.log("Approving spending allowance...");
  const approveTx = await tokenContract.connect(sender).approve(BNB_CHAIN.contractAddress, depositAmount);
  await approveTx.wait();

  console.log(`Depositing ${ethers.formatUnits(depositAmount, tokenDecimals)} tokens...`);
  const depReceipt = await trackPerformance("DEPOSIT_TOKENS", () => 
    client.confidentialDeposit(sender, BNB_CHAIN.tokenAddress, depositAmount, { waitForFinalization: true })
  );
  console.log(`Deposit Tx: ${depReceipt.hash || depReceipt.transactionHash}`);

  // ─── Phase 3: Confidential Transfer ───
  console.log("\n--- Phase 3: Transfer ---");
  console.log("⏱️ Waiting 10 seconds before transferring tokens...");
  // await delay(10000);

  const transferAmount = ethers.parseUnits("0.05", tokenDecimals);
  
  console.log(`Transferring ${ethers.formatUnits(transferAmount, tokenDecimals)} tokens privately...`);
  const txReceipt = await trackPerformance("CONFIDENTIAL_TRANSFER", () => 
    client.confidentialTransfer(sender, recipient.address, BNB_CHAIN.tokenAddress, transferAmount, { waitForFinalization: true })
  );
  console.log(`Transfer Tx: ${txReceipt.hash || txReceipt.transactionHash}`);

  // ─── Phase 4: Withdrawal ───
  console.log("\n--- Phase 4: Withdraw ---");
  console.log("⏱️ Waiting 10 seconds before initiating withdrawal...");
  // await delay(10000);

  const withdrawAmount = ethers.parseUnits("0.05", tokenDecimals);
  
  console.log(`Withdrawing ${ethers.formatUnits(withdrawAmount, tokenDecimals)} tokens...`);
  const withdrawReceipt = await trackPerformance("WITHDRAW_TOKENS", () => 
    client.withdraw(recipient, BNB_CHAIN.tokenAddress, withdrawAmount, { waitForFinalization: true })
  );
  console.log(`Withdraw Tx: ${withdrawReceipt.hash || withdrawReceipt.transactionHash}`);

  console.log(`\n=== Sequence Completed ===`);
  console.table(actionSummary);
}

runBnbFlow().catch((error) => {
  console.error("Execution failed:", error.message || error);
  process.exitCode = 1;
});