"use server";

import { ethers } from "ethers";

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Unknown error");
  }
  return "Unknown error";
}

// ────── BNB Testnet Environment Map ──────
const FAUCET_PRIVATE_KEY = process.env.PRIVATE_KEY; 
const RPC_URL = process.env.NEXT_PUBLIC_BNB_RPC_URL || "https://data-seed-prebsc-1-s3.bnbchain.org:8545";
const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_BNB_TOKEN_ADDRESS || "0xC915876c59f8A902bE7E67cAce5083fb7d790ECe";
const TOKEN_SYMBOL = process.env.NEXT_PUBLIC_BNB_TOKEN_SYMBOL || "mSTB";

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
];

export async function sendFaucet(address: string) {
  try {
    if (!FAUCET_PRIVATE_KEY) {
      return { success: false, error: "Faucet configuration missing" };
    }

    if (!address || !ethers.isAddress(address)) {
      return { success: false, error: "Invalid address provided" };
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, wallet);

    const txHashes: string[] = [];

    let currentNonce = await provider.getTransactionCount(
      wallet.address,
      "latest",
    );

    // --- Send ERC20 (mSTB) ---
    let decimals = 18;
    try {
      decimals = Number(await tokenContract.decimals());
    } catch {
      // fallback to 18
    }

    const tokenAmount = ethers.parseUnits("0.25", decimals);

    const faucetTokenBalance = await tokenContract.balanceOf(wallet.address);
    if (faucetTokenBalance < tokenAmount) {
      return {
        success: false,
        error: `Faucet has insufficient tokens. Has ${ethers.formatUnits(
          faucetTokenBalance,
          decimals,
        )} ${TOKEN_SYMBOL}, needs 0.25`,
      };
    }

    const tokenTx = await tokenContract.transfer(address, tokenAmount, {
      gasLimit: 100000,
      nonce: currentNonce,
    });

    await tokenTx.wait();
    txHashes.push(tokenTx.hash);
    currentNonce++;

    // --- Send native tBNB if needed ---
    const userBalance = await provider.getBalance(address);

    if (userBalance < ethers.parseEther("0.005")) {
      const bnbAmount = ethers.parseEther("0.005"); // Injected baseline to cover higher BSC gas limits safely
      const faucetBnbBalance = await provider.getBalance(wallet.address);

      if (faucetBnbBalance >= bnbAmount) {
        const bnbTx = await wallet.sendTransaction({
          to: address,
          value: bnbAmount,
          nonce: currentNonce,
        });

        await bnbTx.wait();
        txHashes.push(bnbTx.hash);
      }
    }

    return {
      success: true,
      hashes: txHashes,
      hash: txHashes[0],
      message:
        txHashes.length > 1
          ? `Sent 0.25 ${TOKEN_SYMBOL} & 0.005 tBNB`
          : `Sent 0.25 ${TOKEN_SYMBOL}`,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || "Internal server error",
    };
  }
}