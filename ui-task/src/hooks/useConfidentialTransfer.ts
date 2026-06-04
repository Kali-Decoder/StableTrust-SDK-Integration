"use client";

import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { StableTrustService } from "@/services/stabletrust";
import { getWalletState, disconnectWallet, WalletState } from "@/lib/wallet";

export interface LogItem {
  id: number;
  text: string;
  time: string;
  variant?: "success" | "info" | "error";
}

export function useConfidentialTransfer() {
  const [wallet, setWallet] = useState<WalletState>({ address: null, provider: null, signer: null, chainId: null, isConnected: false });
  const [isProcessing, setIsProcessing] = useState(false);
  const [aliceKeys, setAliceKeys] = useState<any>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [metrics, setMetrics] = useState({ native: "0.0000", publicToken: "0.0", shielded: "0.0" });

  const addLog = useCallback((text: string, variant: LogItem["variant"] = "info") => {
    setLogs((prev) => [{ id: Date.now() + Math.random(), text, time: new Date().toLocaleTimeString(), variant }, ...prev]);
  }, []);

  const updateWalletState = useCallback(async () => {
    const state = await getWalletState();

    setWallet(state);

    if (state.address) {
      const pk = localStorage.getItem(
        `st_conf_pk_${state.address.toLowerCase()}`
      );

      const pub = localStorage.getItem(
        `st_conf_pub_${state.address.toLowerCase()}`
      );

      if (pk && pub) {
        setAliceKeys({
          privateKey: pk,
          publicKey: pub,
        });

        console.log(
          "Loaded confidential keys from storage"
        );
      }
    }

    return state;
  }, []);


  useEffect(() => {
    if (!wallet.address) return;

    const pk = localStorage.getItem(
      `st_conf_pk_${wallet.address.toLowerCase()}`
    );

    const pub = localStorage.getItem(
      `st_conf_pub_${wallet.address.toLowerCase()}`
    );

    if (pk && pub) {
      setAliceKeys({
        privateKey: pk,
        publicKey: pub,
      });
    }
  }, [wallet.address]);

  const runDisconnect = useCallback(async () => {
    await disconnectWallet();
    setWallet({ address: null, provider: null, signer: null, chainId: null, isConnected: false });
    setAliceKeys(null);
    setMetrics({ native: "0.0000", publicToken: "0.0", shielded: "0.0" });
    setLogs([]);
    addLog("🔌 Session ended. Local state containers flushed safely.");
  }, [addLog]);

  // 🔄 LIVE INTEGRATION: Pull real-time balances directly from on-chain layout states
  const syncBalances = useCallback(
    async (
      currentKeys = aliceKeys,
      passedWallet = wallet,
      networkMode: "anvil" | "testnet" = "testnet"
    ) => {
      if (
        !passedWallet.isConnected ||
        !passedWallet.address ||
        !passedWallet.signer
      ) {
        return;
      }

      try {
        let keys = currentKeys;

        // Auto-recover confidential keys from localStorage
        if (!keys?.privateKey) {
          const pk = localStorage.getItem(
            `st_conf_pk_${passedWallet.address.toLowerCase()}`
          );

          const pub = localStorage.getItem(
            `st_conf_pub_${passedWallet.address.toLowerCase()}`
          );

          if (pk && pub) {
            keys = {
              privateKey: pk,
              publicKey: pub,
            };

            console.log(
              "Loaded confidential keys from storage"
            );
          }
        }

        console.log("=== BALANCE SYNC ===");
        console.log("Wallet:", passedWallet.address);
        console.log("Keys:", keys);

        const service = new StableTrustService(
          passedWallet.provider,
          passedWallet.signer,
          97
        );

        const updatedMetrics =
          await service.getBalances(
            passedWallet.address,
            keys?.privateKey
          );

        console.log(
          "Updated Metrics:",
          updatedMetrics
        );

        setMetrics(updatedMetrics);
      } catch (err: any) {
        console.error(
          "On-chain balance sync halted:",
          err.message
        );

        try {
          const nativeBal =
            await passedWallet.provider.getBalance(
              passedWallet.address
            );

          setMetrics((prev) => ({
            ...prev,
            native: parseFloat(
              ethers.formatEther(nativeBal)
            ).toFixed(4),
          }));
        } catch { }
      }
    },
    [aliceKeys, wallet]
  );

  useEffect(() => {
    updateWalletState();
    if (typeof window !== "undefined" && window.ethereum) {
      const handleChain = () => { updateWalletState(); };
      const handleAccounts = (accs: any) => { if (accs.length === 0) runDisconnect(); else updateWalletState(); };
      window.ethereum.on("chainChanged", handleChain);
      window.ethereum.on("accountsChanged", handleAccounts);
      return () => {
        window.ethereum.removeListener("chainChanged", handleChain);
        window.ethereum.removeListener("accountsChanged", handleAccounts);
      };
    }
  }, [updateWalletState, runDisconnect]);

  // 🔑 LIVE INTEGRATION: Phase 1 Key Registration
  const runInitAccount = async (networkMode: "anvil" | "testnet" = "anvil") => {
    setIsProcessing(true);

    addLog("⏳ Initiating client-side zero-knowledge account proof compilation...");
    try {
      const service = new StableTrustService(wallet.provider, wallet.signer!, 97);
      const generatedKeys = await service.registerIdentity();
      if (
        generatedKeys?.privateKey &&
        generatedKeys?.publicKey &&
        wallet.address
      ) {
        localStorage.setItem(
          `st_conf_pk_${wallet.address.toLowerCase()}`,
          generatedKeys.privateKey
        );

        localStorage.setItem(
          `st_conf_pub_${wallet.address.toLowerCase()}`,
          generatedKeys.publicKey
        );
      }
      setAliceKeys(generatedKeys);
      addLog("🔒 Cryptographic keys established inside contract storage slots.", "success");
      await syncBalances(generatedKeys, wallet, networkMode);
      return generatedKeys;
    } catch (err: any) {
      addLog(`❌ Registration Failed: ${err.reason || err.message}`, "error");
    } finally { setIsProcessing(false); }
  };

  // 📦 LIVE INTEGRATION: Phase 2 Encrypted Token Shielding (Ingests dynamic inputs from UI)
  const runConfidentialDeposit = async (amountVal: string = "0.2", networkMode: "anvil" | "testnet" = "anvil") => {
    setIsProcessing(true);
    addLog(`🛡️ Authorizing token allocation rules for shielding ${amountVal} assets...`);
    try {
      const service = new StableTrustService(wallet.provider, wallet.signer!, 97);
      const txHash =
        await service.shieldDeposit(
          amountVal
        );

      addLog(
        "⏳ Waiting for FairyPort settlement..."
      );

      await new Promise(
        (resolve) => setTimeout(resolve, 30000)
      );

      await syncBalances(
        aliceKeys,
        wallet,
        networkMode
      );

      addLog(
        `📦 ${amountVal} Tokens successfully shielded into confidential storage pool.`,
        "success"
      );
      return true;
    } catch (err: any) {
      addLog(`❌ Deposit Aborted: ${err.reason || err.message}`, "error");
      return false;
    } finally { setIsProcessing(false); }
  };

  // 💸 LIVE INTEGRATION: Phase 3 Private Transfer (Ingests dynamic target inputs from UI)
  const runConfidentialTransfer = async (recipient: string, amountVal: string = "0.1", networkMode: "anvil" | "testnet" = "anvil") => {
    setIsProcessing(true);
    addLog(`🔒 Instantiating zero-knowledge blinding factor fields to route ${amountVal} tokens...`);

    const pk = localStorage.getItem(
      `st_conf_pk_${wallet.address?.toLowerCase()}`
    );
    
    const pub = localStorage.getItem(
      `st_conf_pub_${wallet.address?.toLowerCase()}`
    );
    
    if (pk && pub) {
      setAliceKeys({
        privateKey: pk,
        publicKey: pub,
      });
    }
    
    try {
      const service = new StableTrustService(wallet.provider, wallet.signer!, 97);
      await syncBalances(
        aliceKeys,
        wallet,
        networkMode
      );

      await new Promise(
        resolve => setTimeout(resolve, 15000)
      );
      console.log("=== TRANSFER DEBUG ===");
      console.log("Sender:", wallet.address);
      console.log("Recipient:", recipient);
      console.log("Amount:", amountVal);
      console.log("Shielded Balance:", metrics.shielded);
      console.log("Keys:", aliceKeys);

      const txHash = await service.privateSend(
        recipient,
        amountVal
      );

      addLog(
        "⏳ Waiting for FairyPort settlement..."
      );

      await new Promise(
        (resolve) => setTimeout(resolve, 30000)
      );

      await syncBalances(
        aliceKeys,
        wallet,
        networkMode
      );

      addLog(
        `💸 Privately routed ${amountVal} tokens targeting obfuscated ledger destination.`,
        "success"
      );
      return true;
    } catch (err: any) {
      addLog(`❌ Transfer Interrupted: ${err.reason || err.message}`, "error");
      return false;
    } finally { setIsProcessing(false); }
  };

  // 🔓 LIVE INTEGRATION: Phase 4 Public Visibility Egress Exit Bridge (Ingests dynamic exit inputs from UI)
  const runConfidentialWithdrawal = async (amountVal: string = "0.025", networkMode: "anvil" | "testnet" = "anvil") => {
    setIsProcessing(true);
    addLog(`🔓 Decompressing zero-knowledge outputs to withdraw ${amountVal} tokens...`);
    try {
      const service = new StableTrustService(wallet.provider, wallet.signer!, 97);
      const txHash = await service.publicExit(amountVal);

      addLog(`🏛️ Settlement complete. ${amountVal} assets returned to transparent visible balance structures.`, "success");
      await syncBalances(aliceKeys, wallet, networkMode);
      return true;
    } catch (err: any) {
      addLog(`❌ Withdrawal Refused: ${err.reason || err.message}`, "error");
      return false;
    } finally { setIsProcessing(false); }
  };

  return {
    wallet,
    isProcessing,
    metrics,
    logs,
    aliceKeys,
    updateWalletState,
    syncBalances,
    runInitAccount,
    runConfidentialDeposit,
    runConfidentialTransfer,
    runConfidentialWithdrawal,
    runDisconnect,
  };
}