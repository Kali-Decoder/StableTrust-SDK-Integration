import { defineChain } from "viem";

export const BNB_TESTNET_CHAIN_ID = 97;

export const BNB_RPC_URL =
  process.env.NEXT_PUBLIC_BNB_RPC_URL?.trim() ||
  "https://data-seed-prebsc-1-s3.bnbchain.org:8545";

export const BNB_EXPLORER_URL =
  process.env.NEXT_PUBLIC_BNB_EXPLORER_URL?.trim() ||
  "https://testnet.bscscan.com/tx/";

export const NETWORK_CONFIG = {
  chainId: 97,

  name: "BNB Smart Chain Testnet",

  rpcUrl: BNB_RPC_URL,

  explorerUrl: BNB_EXPLORER_URL,

  contractAddress:
    process.env.NEXT_PUBLIC_BNB_STABLETRUST_CONTRACT_ADDRESS?.trim() ||
    "0x82CF8d42205f0bdC6A5d3Efcd2b9ca84B3E548AB",

  tokenAddress:
    process.env.NEXT_PUBLIC_BNB_TOKEN_ADDRESS?.trim() ||
    "0x5E6658ac6cBC9b0109C28BED00bC4Af0F0A3f1CD",

  tokenSymbol:
    process.env.NEXT_PUBLIC_BNB_TOKEN_SYMBOL?.trim() || "mSTB",

  gasSymbol: "tBNB",
};

export const NETWORKS_CONFIG = {
  97: NETWORK_CONFIG,
};

export const BNB_TESTNET = defineChain({
  id: 97,

  name: "BNB Smart Chain Testnet",

  nativeCurrency: {
    name: "tBNB",
    symbol: "tBNB",
    decimals: 18,
  },

  rpcUrls: {
    default: {
      http: [BNB_RPC_URL],
    },
  },

  blockExplorers: {
    default: {
      name: "BscScan",
      url: "https://testnet.bscscan.com",
    },
  },

  testnet: true,
});

export const BNB_NETWORK_NAME = NETWORK_CONFIG.name;