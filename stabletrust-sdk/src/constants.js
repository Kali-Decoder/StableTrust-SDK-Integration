/**
 * Contract ABIs and Constants
 */

export const CONTRACT_ABI = [
  "function createConfidentialAccount(bytes elgamalPubkey) external",
  "function createConfidentialAccountResponse(address ownerAddr, uint256 txId, bool ok, uint8 code, bytes elgamalPubkey) external",
  "function deposit(address token, uint256 plainAmount) external",
  "function isOperator(address who) external view returns (bool)",
  "function getAccountCore(address ownerAddr) external view returns ((bool exists, bool finalized, bool pendingAction, uint256 txId, bytes elgamalPubkey, uint64 pendingCreditCounter))",
  "function getAvailable(address ownerAddr, address token) external view returns (bytes c1, bytes c2)",
  "function getPending(address ownerAddr, address token) external view returns (bytes c1, bytes c2)",
  "function transferConfidential(address recipient, address token, bytes proof) external payable",
  "function withdraw(address token, uint256 plainAmount, bytes proof) external",
  "function applyPending() external",
  "function feeAmount() external view returns (uint256)",
];

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

export const TEMPO_FEE_TOKEN_ADDRESS =
  "0x20c0000000000000000000000000000000000000";

export const STABLETRUST_CONTRACTS_BY_CHAIN_ID = Object.freeze({
  2201: "0xA98e5ba75Bb44459916D52Abf1604caB3d98CC4B", //Stable
  5042002: "0xdCF31bd9f325C34E0fb346b1975E141D99AEf731", //Arc
  84532: "0xF66A0a1670F14AE5D1852B4E7d1e4C693b2Accfd", //Base
  11155111: "0xa066b5C30382110d19925108BBa1Eef613a3A041", //Ethereum
  421614: "0xbda65d65A7833D28F9391FF01d0b212B75538Cf2", //Arbitrum
  42431: "0xE559fB936C69c46E216bf61B07C16bF1a6d444aa", //Tempo
  // BNB Smart Chain Testnet
  97: "0x82CF8d42205f0bdC6A5d3Efcd2b9ca84B3E548AB",
  56: "0x0000000000000000000000000000000000000000"
});

export const STABLETRUST_NETWORKS_BY_CHAIN_ID = Object.freeze({
  2201: Object.freeze({
    name: "Stable",
    chainId: 2201,
    rpcUrl: "https://rpc.testnet.stable.xyz",
    explorerUrl: "https://testnet.stablescan.xyz/tx/",
    tokenAddress: "0x78Cf24370174180738C5B8E352B6D14c83a6c9A9",
    contractAddress: STABLETRUST_CONTRACTS_BY_CHAIN_ID[2201],
  }),
  5042002: Object.freeze({
    name: "Arc",
    chainId: 5042002,
    rpcUrl: "https://rpc.testnet.arc.network",
    explorerUrl: "https://testnet.arcscan.app/tx/",
    tokenAddress: "0x3600000000000000000000000000000000000000",
    contractAddress: STABLETRUST_CONTRACTS_BY_CHAIN_ID[5042002],
  }),
  84532: Object.freeze({
    name: "Base",
    chainId: 84532,
    rpcUrl: "https://base-testnet.api.pocket.network",
    explorerUrl: "https://sepolia.basescan.org/tx/",
    tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    contractAddress: STABLETRUST_CONTRACTS_BY_CHAIN_ID[84532],
  }),
  11155111: Object.freeze({
    name: "Ethereum",
    chainId: 11155111,
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorerUrl: "https://sepolia.etherscan.io/tx/",
    tokenAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    contractAddress: STABLETRUST_CONTRACTS_BY_CHAIN_ID[11155111],
  }),
  421614: Object.freeze({
    name: "Arbitrum",
    chainId: 421614,
    rpcUrl: "https://arbitrum-sepolia-testnet.api.pocket.network",
    explorerUrl: "https://sepolia.arbiscan.io/tx/",
    tokenAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    contractAddress: STABLETRUST_CONTRACTS_BY_CHAIN_ID[421614],
  }),
  42431: Object.freeze({
    name: "Tempo",
    chainId: 42431,
    rpcUrl: "https://rpc.moderato.tempo.xyz",
    explorerUrl: "https://explore.tempo.xyz/tx/",
    tokenAddress: TEMPO_FEE_TOKEN_ADDRESS,
    contractAddress: STABLETRUST_CONTRACTS_BY_CHAIN_ID[42431],
  }),
  97: Object.freeze({
    name: "BNB Smart Chain Testnet",
    chainId: 97,
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
    explorerUrl: "https://testnet.bscscan.com/tx/",
    tokenAddress: "0x5E6658ac6cBC9b0109C28BED00bC4Af0F0A3f1CD",
    contractAddress: STABLETRUST_CONTRACTS_BY_CHAIN_ID[97],
  }),
});

export function getStabletrustContractAddress(chainId) {
  return STABLETRUST_CONTRACTS_BY_CHAIN_ID[Number(chainId)] || null;
}

export function getStabletrustNetworkConfig(chainId) {
  return STABLETRUST_NETWORKS_BY_CHAIN_ID[Number(chainId)] || null;
}
