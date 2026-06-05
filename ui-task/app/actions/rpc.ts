"use server";

const RPC_URL = process.env.RPC_URL || "https://data-seed-prebsc-1-s3.bnbchain.org:8545";

export async function getRpcUrl() {
  if (!RPC_URL) {
    return {
      success: false,
      error: "BNB RPC not configured",
    };
  }
  return {
    success: true,
    rpcUrl: RPC_URL,
  };
}