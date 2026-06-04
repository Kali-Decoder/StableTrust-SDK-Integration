"use client";

import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { StableTrustService } from "@/services/stabletrust";
import { getFriendlyError } from "@/lib/error-utils";
import { BNB_TESTNET_CHAIN_ID } from "@/config/bnb";

export interface LogItem {
  id: number;
  text: string;
  time: string;
  variant?: "success" | "info" | "error";
}

export type WalletState = {
  address: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  chainId: number | null;
  isConnected: boolean;
};

export type OperationState = {
  tone: "idle" | "info" | "success" | "error";
  title: string;
  message: string;
};

const initialWalletState: WalletState = {
  address: null,
  provider: null,
  signer: null,
  chainId: null,
  isConnected: false,
};

const initialMetrics = {
  native: "0.0000",
  publicToken: "0.0",
  shielded: "0.0",
};

const initialOperationState: OperationState = {
  tone: "idle",
  title: "Ready",
  message: "Connect a wallet to begin the confidential transfer flow.",
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useConfidentialTransfer() {
  const { address, isConnected, connector, status: accountStatus } = useAccount();
  const chainId = useChainId();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { disconnectAsync, isPending: isDisconnecting } = useDisconnect();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const [wallet, setWallet] = useState<WalletState>(initialWalletState);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aliceKeys, setAliceKeys] = useState<any>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [status, setStatus] = useState<OperationState>(initialOperationState);

  const addLog = useCallback((text: string, variant: LogItem["variant"] = "info") => {
    setLogs((prev) => [
      { id: Date.now() + Math.random(), text, time: new Date().toLocaleTimeString(), variant },
      ...prev,
    ]);
  }, []);

  const showStatus = useCallback((tone: OperationState["tone"], title: string, message: string) => {
    setStatus({ tone, title, message });
  }, []);

  const loadStoredKeys = useCallback((walletAddress: string | null) => {
    if (!walletAddress || typeof window === "undefined") return null;

    const privateKey = localStorage.getItem(`st_conf_pk_${walletAddress.toLowerCase()}`);
    const publicKey = localStorage.getItem(`st_conf_pub_${walletAddress.toLowerCase()}`);

    if (privateKey && publicKey) {
      const keys = { privateKey, publicKey };
      setAliceKeys(keys);
      return keys;
    }

    return null;
  }, []);

  const buildWalletState = useCallback(async (): Promise<WalletState> => {
    if (!isConnected || !address || !connector) {
      return initialWalletState;
    }

    try {
      const eip1193Provider = await connector.getProvider({ chainId });
      const provider = new ethers.BrowserProvider(eip1193Provider as any);
      const signer = await provider.getSigner(address);

      return {
        address,
        provider,
        signer,
        chainId: chainId ?? BNB_TESTNET_CHAIN_ID,
        isConnected: true,
      };
    } catch (error) {
      console.warn("Failed to build ethers wallet state from wagmi:", error);
      return {
        ...initialWalletState,
        address,
        chainId: chainId ?? null,
        isConnected,
      };
    }
  }, [address, chainId, connector, isConnected]);

  useEffect(() => {
    let cancelled = false;

    const syncWallet = async () => {
      if (!isConnected || !address || !connector) {
        if (!cancelled) {
          setWallet(initialWalletState);
          setAliceKeys(null);
          setStatus(initialOperationState);
        }
        return;
      }

      const nextWallet = await buildWalletState();
      if (cancelled) return;

      setWallet(nextWallet);
      loadStoredKeys(nextWallet.address);

      if (nextWallet.chainId && nextWallet.chainId !== BNB_TESTNET_CHAIN_ID) {
        showStatus("error", "Wrong network", "Switch to BNB Smart Chain Testnet to continue the confidential flow.");
      } else {
        showStatus("info", "Wallet connected", "Your wallet is ready. Continue with account setup or refresh balances.");
      }
    };

    syncWallet();

    return () => {
      cancelled = true;
    };
  }, [address, buildWalletState, connector, isConnected, loadStoredKeys, showStatus]);

  const requestConnect = useCallback(async (): Promise<WalletState | null> => {
    if (isConnected && wallet.address) {
      return wallet;
    }

    const preferredConnector =
      connectors.find((item: any) => item.id === "injected") ?? connectors[0];

    if (!preferredConnector) {
      throw new Error("No wallet connector is available. Install a browser wallet or retry after reopening RainbowKit.");
    }

    try {
      const connection = await connectAsync({ connector: preferredConnector });
      const eip1193Provider = await preferredConnector.getProvider({ chainId: connection.chainId });
      const provider = new ethers.BrowserProvider(eip1193Provider as any);
      const signer = await provider.getSigner(connection.accounts[0]);
      const nextWallet: WalletState = {
        address: connection.accounts[0],
        provider,
        signer,
        chainId: connection.chainId,
        isConnected: true,
      };

      setWallet(nextWallet);
      loadStoredKeys(nextWallet.address);
      await delay(150);
      return nextWallet;
    } catch (error) {
      throw new Error(getFriendlyError(error, "wallet connection").message);
    }
  }, [connectAsync, connectors, isConnected, loadStoredKeys, wallet]);

  const runDisconnect = useCallback(async () => {
    try {
      await disconnectAsync();
    } finally {
      setWallet(initialWalletState);
      setAliceKeys(null);
      setMetrics(initialMetrics);
      setLogs([]);
      setStatus(initialOperationState);
      addLog("Session ended and local demo state was cleared.", "info");
    }
  }, [addLog, disconnectAsync]);

  const requestSwitchChain = useCallback(async () => {
    try {
      if (chainId === BNB_TESTNET_CHAIN_ID) return;
      await switchChainAsync({ chainId: BNB_TESTNET_CHAIN_ID });
      await delay(250);
    } catch (error) {
      throw new Error(getFriendlyError(error, "network switch").message);
    }
  }, [chainId, switchChainAsync]);

  const updateWalletState = useCallback(async () => {
    const nextWallet = await buildWalletState();
    setWallet(nextWallet);

    if (nextWallet.address) {
      loadStoredKeys(nextWallet.address);
    }
    return nextWallet;
  }, [buildWalletState, loadStoredKeys]);

  const syncBalances = useCallback(
    async (
      currentKeys = aliceKeys,
      passedWallet = wallet,
      networkMode: "anvil" | "testnet" = "testnet"
    ) => {
      if (!passedWallet.isConnected || !passedWallet.address || !passedWallet.signer || !passedWallet.provider) {
        return;
      }

      let keys = currentKeys;
      if (!keys?.privateKey) {
        keys = loadStoredKeys(passedWallet.address) ?? undefined;
      }

      const service = new StableTrustService(passedWallet.provider, passedWallet.signer, BNB_TESTNET_CHAIN_ID);

      const refreshWithRetry = async () => {
        let lastError: unknown = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            return await service.getBalances(passedWallet.address!, keys?.privateKey);
          } catch (error) {
            lastError = error;
            await delay(600 * attempt);
          }
        }

        throw lastError ?? new Error("Balance refresh failed");
      };

      try {
        const updatedMetrics = await refreshWithRetry();
        setMetrics(updatedMetrics);
        showStatus("success", "Balances refreshed", "On-chain and confidential balances are up to date.");
      } catch (error) {
        const friendly = getFriendlyError(error, "balance refresh");
        addLog(`⚠️ ${friendly.title}: ${friendly.message}`, "error");
        showStatus("error", friendly.title, friendly.hint);

        try {
          const nativeBal = await passedWallet.provider.getBalance(passedWallet.address);
          setMetrics((prev) => ({
            ...prev,
            native: parseFloat(ethers.formatEther(nativeBal)).toFixed(4),
          }));
        } catch {
          // Keep the last visible values if even the fallback balance check fails.
        }
      }
    },
    [addLog, aliceKeys, loadStoredKeys, showStatus, wallet]
  );

  const runInitAccount = async (networkMode: "anvil" | "testnet" = "anvil") => {
    if (!wallet.provider || !wallet.signer || !wallet.address) {
      const friendly = getFriendlyError(new Error("Wallet is not connected"), "account registration");
      addLog(`❌ ${friendly.title}: ${friendly.message}`, "error");
      showStatus("error", friendly.title, friendly.hint);
      return false;
    }

    setIsProcessing(true);
    showStatus("info", "Preparing account", "Creating or finalizing your confidential identity.");
    addLog("Starting confidential account setup.", "info");

    try {
      const service = new StableTrustService(wallet.provider, wallet.signer, BNB_TESTNET_CHAIN_ID);
      const generatedKeys = await service.registerIdentity();

      if (generatedKeys?.privateKey && generatedKeys?.publicKey && wallet.address) {
        localStorage.setItem(`st_conf_pk_${wallet.address.toLowerCase()}`, generatedKeys.privateKey);
        localStorage.setItem(`st_conf_pub_${wallet.address.toLowerCase()}`, generatedKeys.publicKey);
      }

      setAliceKeys(generatedKeys);
      addLog("Confidential account is ready.", "success");
      showStatus("success", "Account ready", "You can now deposit, transfer, and withdraw privately.");
      await syncBalances(generatedKeys, wallet, networkMode);
      return true;
    } catch (error: any) {
      const friendly = getFriendlyError(error, "account registration");
      addLog(`❌ ${friendly.title}: ${friendly.message}`, "error");
      showStatus("error", friendly.title, friendly.hint);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const runConfidentialDeposit = async (amountVal: string = "0.2", networkMode: "anvil" | "testnet" = "anvil") => {
    if (!wallet.provider || !wallet.signer || !wallet.address) {
      const friendly = getFriendlyError(new Error("Wallet is not connected"), "deposit");
      addLog(`❌ ${friendly.title}: ${friendly.message}`, "error");
      showStatus("error", friendly.title, friendly.hint);
      return false;
    }

    setIsProcessing(true);
    showStatus("info", "Submitting deposit", "Approve the token transfer, then wait for relayer settlement.");
    addLog(`Shielding ${amountVal} tokens into confidential balance.`, "info");

    try {
      const service = new StableTrustService(wallet.provider, wallet.signer, BNB_TESTNET_CHAIN_ID);
      await service.shieldDeposit(amountVal);
      addLog("Deposit submitted. Refreshing balances as the relayer settles.", "info");
      await syncBalances(aliceKeys, wallet, networkMode);
      await delay(900);
      await syncBalances(aliceKeys, wallet, networkMode);
      addLog(`${amountVal} tokens were shielded successfully.`, "success");
      showStatus("success", "Deposit complete", "Your shielded balance has been updated.");
      return true;
    } catch (error: any) {
      const friendly = getFriendlyError(error, "deposit");
      addLog(`❌ ${friendly.title}: ${friendly.message}`, "error");
      showStatus("error", friendly.title, friendly.hint);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const runConfidentialTransfer = async (
    recipient: string,
    amountVal: string = "0.1",
    networkMode: "anvil" | "testnet" = "anvil"
  ) => {
    if (!wallet.provider || !wallet.signer || !wallet.address) {
      const friendly = getFriendlyError(new Error("Wallet is not connected"), "transfer");
      addLog(`❌ ${friendly.title}: ${friendly.message}`, "error");
      showStatus("error", friendly.title, friendly.hint);
      return false;
    }

    setIsProcessing(true);
    showStatus("info", "Submitting transfer", "The amount stays hidden while the chain verifies the action.");
    addLog(`Sending ${amountVal} tokens to a confidential recipient.`, "info");

    try {
      const service = new StableTrustService(wallet.provider, wallet.signer, BNB_TESTNET_CHAIN_ID);
      await syncBalances(aliceKeys, wallet, networkMode);
      const txHash = await service.privateSend(recipient, amountVal);
      addLog(`Transfer submitted: ${txHash}`, "info");
      await syncBalances(aliceKeys, wallet, networkMode);
      await delay(900);
      await syncBalances(aliceKeys, wallet, networkMode);
      addLog(`Confidential transfer of ${amountVal} tokens completed.`, "success");
      showStatus("success", "Transfer complete", "Balances have been refreshed after settlement.");
      return true;
    } catch (error: any) {
      const friendly = getFriendlyError(error, "transfer");
      addLog(`❌ ${friendly.title}: ${friendly.message}`, "error");
      showStatus("error", friendly.title, friendly.hint);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const runConfidentialWithdrawal = async (amountVal: string = "0.025", networkMode: "anvil" | "testnet" = "anvil") => {
    if (!wallet.provider || !wallet.signer || !wallet.address) {
      const friendly = getFriendlyError(new Error("Wallet is not connected"), "withdrawal");
      addLog(`❌ ${friendly.title}: ${friendly.message}`, "error");
      showStatus("error", friendly.title, friendly.hint);
      return false;
    }

    setIsProcessing(true);
    showStatus("info", "Submitting withdrawal", "The relayer will return funds to your public wallet.");
    addLog(`Withdrawing ${amountVal} tokens back to the public wallet.`, "info");

    try {
      const service = new StableTrustService(wallet.provider, wallet.signer, BNB_TESTNET_CHAIN_ID);
      const txHash = await service.publicExit(amountVal);
      addLog(`Withdrawal submitted: ${txHash}`, "info");
      await syncBalances(aliceKeys, wallet, networkMode);
      await delay(900);
      await syncBalances(aliceKeys, wallet, networkMode);
      addLog(`Withdrawal of ${amountVal} tokens completed.`, "success");
      showStatus("success", "Withdrawal complete", "Your public balance has been refreshed.");
      return true;
    } catch (error: any) {
      const friendly = getFriendlyError(error, "withdrawal");
      addLog(`❌ ${friendly.title}: ${friendly.message}`, "error");
      showStatus("error", friendly.title, friendly.hint);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    wallet,
    isProcessing,
    isConnecting,
    isDisconnecting,
    isSwitchingChain,
    metrics,
    logs,
    aliceKeys,
    status,
    accountStatus,
    updateWalletState,
    syncBalances,
    requestConnect,
    requestDisconnect: runDisconnect,
    requestSwitchChain,
    runInitAccount,
    runConfidentialDeposit,
    runConfidentialTransfer,
    runConfidentialWithdrawal,
    runDisconnect,
  };
}
