"use client";

import { ethers } from "ethers";

export type WalletState = {
  address: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  chainId: number | null;
  isConnected: boolean;
};

export async function connectWallet(): Promise<WalletState> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask or compatible wallet not found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();

  return {
    address: accounts[0],
    provider,
    signer,
    chainId: Number(network.chainId),
    isConnected: true,
  };
}

export async function getWalletState(): Promise<WalletState> {
  if (typeof window === "undefined" || !window.ethereum) {
    return {
      address: null,
      provider: null,
      signer: null,
      chainId: null,
      isConnected: false,
    };
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_accounts", []);

  if (accounts.length === 0) {
    return {
      address: null,
      provider: null,
      signer: null,
      chainId: null,
      isConnected: false,
    };
  }

  const signer = await provider.getSigner();
  const network = await provider.getNetwork();

  return {
    address: accounts[0],
    provider,
    signer,
    chainId: Number(network.chainId),
    isConnected: true,
  };
}

export async function switchNetwork(chainId: number, rpcUrl: string, chainName: string) {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not found");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${chainId.toString(16)}`,
            chainName,
            rpcUrls: [rpcUrl],
            nativeCurrency: {
              name: "ETH",
              symbol: "ETH",
              decimals: 18,
            },
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}
