"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Wallet, LogOut, ExternalLink, Loader2, ChevronDown } from "lucide-react";
import { useConfidentialTransfer } from "@/hooks/useConfidentialTransfer";
import { NETWORK_CONFIG } from "@/config/bnb";
import { getFriendlyError } from "@/lib/error-utils";

type StepKey = "claim" | "init" | "balances" | "deposit" | "transfer" | "withdraw";

const steps: Array<{ key: StepKey; label: string }> = [
  { key: "claim", label: "Request Faucet" },
  { key: "init", label: "Initialize ZK Key" },
  { key: "balances", label: "Verify Balances" },
  { key: "deposit", label: "Shield Deposit" },
  { key: "transfer", label: "Confidential Transfer" },
  { key: "withdraw", label: "Public Withdrawal" },
];

function shortAddress(value?: string | null) {
  if (!value) return "Not connected";
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export default function ConfidentialTransferDashboard() {
  const {
    wallet,
    isProcessing,
    metrics,
    logs,
    aliceKeys,
    status,
    isConnecting,
    isDisconnecting,
    isSwitchingChain,
    syncBalances,
    requestConnect,
    requestDisconnect,
    requestSwitchChain,
    runInitAccount,
    runConfidentialDeposit,
    runConfidentialTransfer,
    runConfidentialWithdrawal
  } = useConfidentialTransfer();

  const [activeStep, setActiveStep] = useState<StepKey>("claim");
  const [networkOverrideMode, setNetworkOverrideMode] = useState<"anvil" | "testnet">("testnet");
  const [uiNotice, setUiNotice] = useState<{ tone: "info" | "error" | "success"; title: string; message: string } | null>(null);
  const isWrongNetwork = wallet.isConnected && wallet.chainId !== null && wallet.chainId !== 97;
  const isWalletBusy = isConnecting || isDisconnecting || isSwitchingChain;

  // Controlled form states
  const [depositAmount, setDepositAmount] = useState<string>("0.2");
  const [recipientAddress, setRecipientAddress] = useState<string>("0x715fcECCD51db40fd10641334b92dB05180c119d");
  const [transferAmount, setTransferAmount] = useState<string>("0.1");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("0.025");

  const currentIndex = useMemo(() => steps.findIndex((s) => s.key === activeStep), [activeStep]);

  const currentNetwork = useMemo(() => {
    return {
      chainId: 97,
      name: networkOverrideMode === "anvil" ? "Local Anvil Node (Spoofed 97)" : "BNB Smart Chain Testnet",
      tokenSymbol: NETWORK_CONFIG.tokenSymbol,
      gasSymbol: "tBNB",
      contractAddress: process.env.NEXT_PUBLIC_BNB_STABLETRUST_CONTRACT_ADDRESS || NETWORK_CONFIG.contractAddress,
      explorerUrl: NETWORK_CONFIG.explorerUrl
    };
  }, [networkOverrideMode]);

  const handleManualRefresh = useCallback(async () => {
    if (!wallet.isConnected) return;
    await syncBalances(aliceKeys, wallet, networkOverrideMode);
  }, [
    wallet,
    aliceKeys,
    syncBalances,
    networkOverrideMode
  ]);

  useEffect(() => {
    if (wallet.isConnected) {
      syncBalances(aliceKeys, wallet, networkOverrideMode);
    }
  }, [wallet.isConnected, wallet.chainId, wallet.address, aliceKeys, networkOverrideMode, syncBalances]);

  console.log("Diamond:", currentNetwork.contractAddress);
  console.log("Wallet:", wallet.address);
  console.log("Network:", networkOverrideMode);
  console.log("Public:", metrics.publicToken);
  console.log("Shielded:", metrics.shielded);

  const handleNetworkSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chosenMode = e.target.value as "anvil" | "testnet";
    setNetworkOverrideMode(chosenMode);
    setUiNotice({
      tone: "info",
      title: "Switching network",
      message: `Please confirm the network change in your wallet. ${chosenMode === "anvil" ? "Anvil" : "BNB Smart Chain Testnet"} will be used for the next step.`,
    });
    try {
      if (chosenMode === "testnet" && wallet.isConnected && wallet.chainId !== 97) {
        await requestSwitchChain();
      }
      await syncBalances(aliceKeys, wallet, chosenMode);
    } catch (err) {
      const friendly = getFriendlyError(err, "network switch");
      setUiNotice({
        tone: "error",
        title: friendly.title,
        message: friendly.message,
      });
    }
  };

  const handlePrimaryAction = async () => {
    if (!wallet.isConnected) {
      try {
        setUiNotice(null);
        setUiNotice({
          tone: "info",
          title: "Connect wallet",
          message: "Approve the wallet connection request to continue.",
        });
        const freshWallet = await requestConnect();
        if (!freshWallet) return;
        await syncBalances(aliceKeys, freshWallet, networkOverrideMode);
        if (freshWallet.chainId && freshWallet.chainId !== 97) {
          setUiNotice({
            tone: "error",
            title: "Wrong network",
            message: "Switch to BNB Smart Chain Testnet before running the confidential flow.",
          });
          return;
        }
      } catch (err) {
        const friendly = getFriendlyError(err, "wallet connection");
        setUiNotice({
          tone: "error",
          title: friendly.title,
          message: friendly.message,
        });
      }
      return;
    }

    if (wallet.chainId && wallet.chainId !== 97) {
      setUiNotice({
        tone: "error",
        title: "Wrong network",
        message: "Switch your wallet to BNB Smart Chain Testnet before continuing.",
      });
      return;
    }

    switch (activeStep) {
      case "claim":
        setActiveStep("init");
        break;
      case "init":
        if (await runInitAccount(networkOverrideMode)) {
          setActiveStep("balances");
        }
        break;
      case "balances":
        await handleManualRefresh();
        setActiveStep("deposit");
        break;
      case "deposit": {
        const success =
          await runConfidentialDeposit(
            depositAmount,
            networkOverrideMode
          );

        if (success) {
          setActiveStep("transfer");
        }

        break;
      }
      case "transfer": {
        const success =
          await runConfidentialTransfer(
            recipientAddress,
            transferAmount,
            networkOverrideMode
          );

        if (success) {
          setActiveStep("withdraw");
        }

        break;
      }
      case "withdraw": {
        const success =
          await runConfidentialWithdrawal(
            withdrawAmount,
            networkOverrideMode
          );

        if (success) {
          setActiveStep("balances");
        }

        break;
      }
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 xl:grid-cols-[340px_1fr_380px] bg-[#EBF0F5] antialiased">

      {/* COLUMN 1: SIDEBAR CONTROL STRIP (Responsive: Top on mobile, Left Sidebar on Laptop) */}
      <aside className="mock-sidebar-panel border-b xl:border-b-0 xl:border-r border-slate-200 px-6 py-8 xl:px-8 xl:py-10 bg-slate-50/50 xl:bg-transparent">
        <div className="space-y-8 xl:space-y-12">
          <div>
            <h1 className="text-2xl xl:text-3xl font-bold font-sans text-slate-900 leading-none tracking-tight">Confidential Assets</h1>
            <div className="text-2xl xl:text-3xl font-serif italic text-blue-600 mt-1 font-normal">&amp; Payments.</div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-slate-400 mt-2 uppercase">by Fairblock</div>
          </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4 xl:gap-6">
            {/* Wallet Identity Card */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 xl:mb-3">Wallet Identity</div>
              <div className="border border-slate-200 p-4 rounded bg-white shadow-sm">
                <div className="flex items-start gap-3">
                  <Wallet className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-xs font-mono text-slate-600 break-all leading-normal flex-1">
                    <div className="text-slate-900 font-medium font-sans mb-1 truncate">
                      {wallet.isConnected ? shortAddress(wallet.address) : "Not Connected"}
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-slate-100">
                      <span>Gas asset:</span>
                      <span className="text-slate-900 font-bold">
                        {wallet.isConnected ? `${metrics.native} ${currentNetwork.gasSymbol}` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-slate-100">
                      <span>Network:</span>
                      <span className={`font-bold ${wallet.chainId && wallet.chainId !== 97 ? "text-rose-600" : "text-emerald-600"}`}>
                        {wallet.isConnected ? (wallet.chainId === 97 ? "BNB Testnet" : `Chain ${wallet.chainId ?? "—"}`) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Network Selector Dropdown Container */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 xl:mb-3">Active Network Ecosystem</div>
              <div className="relative border border-slate-200 rounded bg-white px-3 py-3 flex items-center justify-between shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 absolute left-4" />
                <select
                  value={networkOverrideMode}
                  onChange={handleNetworkSelectChange}
                  className="w-full bg-transparent pl-6 text-xs font-bold text-slate-700 uppercase tracking-wider outline-none border-none cursor-pointer appearance-none relative z-10"
                >
                  <option value="anvil">Local Anvil Node (Spoofed 97)</option>
                  <option value="testnet">BNB Smart Chain Testnet (Live 97)</option>
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-4 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Stepper Rail Links (Horizontal Scroll on Mobile, Vertical Stack on Desktop) */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 block xl:hidden">Navigation Steps</div>
            <nav className="flex xl:flex-col gap-3 xl:gap-4 overflow-x-auto xl:overflow-x-visible pb-3 xl:pb-0 font-medium text-xs xl:text-sm text-slate-700 whitespace-nowrap scrollbar-none">
              {steps.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveStep(s.key)}
                  className={`text-left border border-slate-200 xl:border-none bg-white xl:bg-transparent px-3 py-1.5 xl:p-0 rounded-full xl:rounded-none cursor-pointer hover:text-blue-600 transition-all shadow-sm xl:shadow-none ${activeStep === s.key ? "text-blue-600 font-bold border-blue-200 bg-blue-50/50" : ""}`}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="border-t border-slate-200 xl:border-slate-100 pt-6 mt-6 xl:mt-12">
      {wallet.isConnected ? (
            <button onClick={requestDisconnect} disabled={isWalletBusy} className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-400 hover:text-rose-600 transition-colors border-none bg-none cursor-pointer p-0 font-sans disabled:cursor-not-allowed disabled:opacity-60" type="button">
              <LogOut className="h-4 w-4 text-slate-400" />
              <span>Disconnect Session</span>
            </button>
          ) : (
            <button onClick={handlePrimaryAction} className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-blue-600 hover:text-blue-800 transition-colors border-none bg-none cursor-pointer p-0 font-sans" type="button">
              <Wallet className="h-4 w-4" />
              <span>Connect Session</span>
            </button>
          )}
        </div>
      </aside>

      {/* COLUMN 2: CENTER OPERATIONS FRAMEWORK WORKSPACE */}
      <main className="flex items-center justify-center p-4 sm:p-6 lg:p-12 order-1 xl:order-none">
        <div className="w-full max-w-[620px] bg-white border border-slate-200 shadow-sm p-6 sm:p-8 xl:p-10 rounded">

          {(uiNotice || status.tone !== "idle") && (
            <div className={`mb-6 rounded border px-4 py-3 text-sm leading-relaxed ${
              (uiNotice?.tone || status.tone) === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : (uiNotice?.tone || status.tone) === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
            }`}>
              <div className="font-semibold">
                {uiNotice?.title || status.title}
              </div>
              <div className="text-xs mt-1 opacity-90">
                {uiNotice?.message || status.message}
              </div>
            </div>
          )}

          {/* Stepper Progress Bar Block Header */}
          <div className="flex items-center gap-2 mb-8">
            {steps.map((step, idx) => (
              <div
                key={step.key}
                className={`h-1 flex-1 transition-all rounded-full ${idx <= currentIndex ? "bg-blue-600" : "bg-slate-100"}`}
              />
            ))}
          </div>

          {/* ─── STEP 1: FAUCET CLAIM PANEL ─── */}
          {activeStep === "claim" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-serif text-slate-900 font-bold tracking-tight">Step 1: Request Testnet Faucet</h3>
                <p className="text-sm text-slate-500 leading-relaxed mt-3 font-sans">
                  Acquire developmental testing assets from the open context faucets to fund public transaction states and initial deposits.
                </p>
              </div>
              <div className="pt-4 space-y-4">
                <button
                  onClick={handlePrimaryAction}
                  disabled={isWalletBusy}
                  className="w-full mock-action-btn py-3.5 text-sm uppercase tracking-wider rounded border-none bg-blue-600 hover:bg-blue-700 text-white cursor-pointer font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="button"
                >
                  {isWalletBusy ? "Processing Wallet..." : `Claim 0.25 ${currentNetwork.tokenSymbol} Tokens`}
                </button>
                <div className="text-center">
                  <button
                    onClick={() => setActiveStep("init")}
                    className="text-xs text-slate-400 underline underline-offset-4 hover:text-slate-600 border-none bg-none cursor-pointer font-sans"
                    type="button"
                  >
                    Skip this step
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 2: ZK KEY INITIALIZATION ─── */}
          {activeStep === "init" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-serif text-slate-900 font-bold tracking-tight">Step 2: Initialize Cryptographic Keys</h3>
                <p className="text-sm text-slate-500 leading-relaxed mt-3 font-sans">
                  Generate secure zero-knowledge homomorphic key identity pairs locally inside browser runtime variables to initialize contract state slots.
                </p>
              </div>
              <div className="pt-4 space-y-4">
                <button
                  onClick={handlePrimaryAction}
                  disabled={isProcessing || isWalletBusy}
                  className="w-full mock-action-btn py-3.5 text-sm uppercase tracking-wider rounded border-none bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center justify-center gap-2 font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="button"
                >
                  {(isProcessing || isWalletBusy) && <Loader2 className="h-4 w-4 animate-spin text-white" />}
                  <span>{isProcessing || isWalletBusy ? "Processing Wallet..." : "Initialize Confidential Vault"}</span>
                </button>
                <div className="text-center">
                  <button
                    onClick={() => setActiveStep("balances")}
                    className="text-xs text-slate-400 underline underline-offset-4 hover:text-slate-600 border-none bg-none cursor-pointer font-sans"
                    type="button"
                  >
                    Skip this step
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 3: BALANCE SYNCHRONIZATION OVERRIDE PANEL ─── */}
          {activeStep === "balances" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-serif text-slate-900 font-bold tracking-tight">Sync Ledger Parameter Value Specs</h3>
                <p className="text-sm text-slate-500 leading-relaxed mt-3 font-sans">
                  Force a cold query request update to safely retrieve your encrypted balance slices from on-chain tracking block frames.
                </p>
              </div>
              <div className="pt-4 space-y-4">
                <button
                  onClick={handlePrimaryAction}
                  disabled={isWalletBusy}
                  className="w-full mock-action-btn py-3.5 text-sm uppercase tracking-wider rounded border-none bg-blue-600 hover:bg-blue-700 text-white cursor-pointer font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="button"
                >
                  {isWalletBusy ? "Processing Wallet..." : "Refetch Ledger Values"}
                </button>
                <div className="text-center">
                  <button
                    onClick={() => setActiveStep("deposit")}
                    className="text-xs text-slate-400 underline underline-offset-4 hover:text-slate-600 border-none bg-none cursor-pointer font-sans"
                    type="button"
                  >
                    Skip this step
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 4: DEPOSIT VIEW (Matches Screenshot 2026-06-03 at 4.02.49 AM) ─── */}
          {activeStep === "deposit" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-serif text-slate-900 font-bold tracking-tight">Step 3: Deposit to Confidential</h3>
                <p className="text-sm text-slate-500 leading-relaxed mt-3 font-sans">
                  Move public tokens into your confidential balance so you can transfer them privately.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-sans">
                  Amount
                </label>
                <input
                  type="text"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded px-4 py-3.5 text-base font-sans text-slate-800 focus:border-blue-600 focus:outline-none transition-colors shadow-sm bg-white"
                  placeholder="0.0"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handlePrimaryAction}
                  disabled={isProcessing || isWalletBusy || !wallet.isConnected || isWrongNetwork}
                  className="w-full mock-action-btn py-3.5 text-sm uppercase tracking-wider rounded border-none bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center justify-center gap-2 font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="button"
                >
                  {(isProcessing || isWalletBusy) && <Loader2 className="h-4 w-4 animate-spin text-white" />}
                  <span>{isProcessing || isWalletBusy ? "Processing Wallet..." : "Deposit"}</span>
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setActiveStep("transfer")}
                  className="text-xs text-slate-400 underline underline-offset-4 hover:text-slate-600 border-none bg-none cursor-pointer font-sans"
                  type="button"
                >
                  Skip this step
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 5: TRANSFER VIEW (Matches Screenshot 2026-06-03 at 4.04.23 PM) ─── */}
          {activeStep === "transfer" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-serif text-slate-900 font-bold tracking-tight">Step 4: Confidential Transfer</h3>
                <p className="text-sm text-slate-500 leading-relaxed mt-3 font-sans">
                  Send your confidential tokens to another address. Onchain observers won't see the encrypted amount transferred.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-sans">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full border border-slate-200 bg-[#F1F5F9]/60 rounded px-4 py-3.5 text-sm font-mono text-slate-700 focus:border-blue-600 focus:outline-none transition-colors shadow-inner"
                  placeholder="0x..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-sans">
                  Amount
                </label>
                <input
                  type="text"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded px-4 py-3.5 text-base font-sans text-slate-800 focus:border-blue-600 focus:outline-none transition-colors shadow-sm bg-white"
                  placeholder="0.0"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handlePrimaryAction}
                  disabled={isProcessing || isWalletBusy || !wallet.isConnected || isWrongNetwork}
                  className="w-full py-4 text-sm uppercase tracking-wider rounded border-none cursor-pointer flex items-center justify-center gap-2 font-medium font-sans text-white bg-[#8299E8] hover:bg-[#6C85DB] disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm"
                  type="button"
                >
                  {(isProcessing || isWalletBusy) && <Loader2 className="h-4 w-4 animate-spin text-slate-300" />}
                  <span>{isProcessing || isWalletBusy ? "Processing Wallet..." : "Confidential Transfer"}</span>
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setActiveStep("withdraw")}
                  className="text-xs text-slate-400 underline underline-offset-4 hover:text-slate-600 border-none bg-none cursor-pointer font-sans"
                  type="button"
                >
                  Skip this step
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 6: PUBLIC WITHDRAWAL EXIT BRIDGING VIEW ─── */}
          {activeStep === "withdraw" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-serif text-slate-900 font-bold tracking-tight">Step 5: Public Withdrawal</h3>
                <p className="text-sm text-slate-500 leading-relaxed mt-3 font-sans">
                  Extract positions out of the shielding layers and restore clear visible parameters back on-chain.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-sans">
                  Withdrawal Amount
                </label>
                <input
                  type="text"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded px-4 py-3.5 text-base font-sans text-slate-800 focus:border-blue-600 focus:outline-none transition-colors shadow-sm bg-white"
                  placeholder="0.0"
                />
              </div>

              <div className="pt-4 space-y-4">
                <button
                  onClick={handlePrimaryAction}
                  disabled={isProcessing || isWalletBusy || !wallet.isConnected || isWrongNetwork}
                  className="w-full mock-action-btn py-3.5 text-sm uppercase tracking-wider rounded border-none bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center justify-center gap-2 font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="button"
                >
                  {(isProcessing || isWalletBusy) && <Loader2 className="h-4 w-4 animate-spin text-white" />}
                  <span>{isProcessing || isWalletBusy ? "Processing Wallet..." : "Exit Privacy Layer Pool"}</span>
                </button>
                <div className="text-center">
                  <button
                    onClick={() => setActiveStep("balances")}
                    className="text-xs text-slate-400 underline underline-offset-4 hover:text-slate-600 border-none bg-none cursor-pointer font-sans"
                    type="button"
                  >
                    Skip this step
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* COLUMN 3: RIGHT PANEL STATUS VIEWER (Responsive: Lower stack on mobile, Right Sidebar on Laptop) */}
      <aside className="mock-sidebar-panel border-t xl:border-t-0 xl:border-l border-slate-200 px-6 py-8 xl:px-8 xl:py-10 bg-slate-50/30 xl:bg-transparent">
        <div className="space-y-6 xl:space-y-8 flex-1 flex flex-col justify-between h-full">
          <div className="space-y-4 xl:space-y-6">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Account Assets</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
              <div className="mock-card-flat px-5 py-4 border border-slate-200 rounded bg-white shadow-sm">
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Public Balance</div>
                <div className="text-xl xl:text-2xl font-serif text-slate-800 mt-2">
                  {metrics.publicToken} <span className="text-xs font-sans text-slate-400 font-medium">{currentNetwork.tokenSymbol}</span>
                </div>
              </div>

              <div className="mock-card-accent px-5 py-4 border border-blue-100 rounded bg-blue-50/30 shadow-sm">
                <div className="text-[9px] font-bold uppercase tracking-wider text-blue-600 italic font-serif font-bold">Confidential Balance</div>
                <div className="text-xl xl:text-2xl font-serif text-slate-800 mt-2">
                  {metrics.shielded} <span className="text-xs font-sans text-slate-400 font-medium">{currentNetwork.tokenSymbol}</span>
                </div>
              </div>
            </div>

            <button onClick={handleManualRefresh} className="w-full bg-white border border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-widest py-3.5 hover:bg-slate-50 rounded shadow-sm transition-all cursor-pointer" type="button">
              Refresh Assets
            </button>
          </div>

          <div className="flex-1 flex flex-col min-h-[180px] mt-6 xl:mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Activity Log</div>
            <div className="flex-1 border border-dashed border-slate-200 bg-slate-50/50 p-4 font-mono text-[11px] leading-5 text-slate-600 overflow-y-auto h-[180px] xl:max-h-[220px] rounded shadow-inner">
              {logs.length === 0 ? (
                <div className="text-slate-400 italic text-center py-10 font-sans">No recent activity.</div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`border-b pb-1 last:border-none ${
                        log.variant === "error"
                          ? "border-rose-100 text-rose-600"
                          : log.variant === "success"
                          ? "border-emerald-100 text-emerald-700"
                          : "border-slate-100 text-slate-600"
                      }`}
                    >
                      <span className="text-slate-400">[{log.time}]</span> {log.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-200 xl:border-slate-100 pt-6 mt-6">
            <a href={currentNetwork.explorerUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-blue-600 text-white font-bold text-[11px] tracking-widest uppercase px-5 py-4 rounded hover:bg-blue-700 shadow-sm transition-colors decoration-none">
              <span>Partner Portal</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="border-t border-slate-200 xl:border-slate-100 pt-4 mt-6 font-mono text-[9px] text-slate-400 break-all select-all">
          <span className="font-bold text-slate-400 font-sans block mb-1">STABLETRUST PROXIES LINK:</span>
          {currentNetwork.contractAddress}
        </div>
      </aside>

    </div>
  );
}
