import { useEffect, useState, useCallback, useMemo } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { ConfidentialTransferClient } from "@/lib/sdk-proxy";
import { parseError, AppError } from "../utils/errorParser";
import { getRpcUrl } from "../actions/rpc";
import { sendFaucet } from "../actions/faucet";

export interface ConfidentialConfig {
  rpcUrl: string;
  tokenAddress: string;
  contractAddress: string; 
  explorerUrl: string;
  chainId: number;
}

const DEFAULT_CONFIG: ConfidentialConfig = {
  rpcUrl: "https://data-seed-prebsc-1-s3.bnbchain.org:8545",
  tokenAddress:
    process.env.NEXT_PUBLIC_BNB_TOKEN_ADDRESS ||
    "0xC915876c59f8A902bE7E67cAce5083fb7d790ECe",
  contractAddress:
    process.env.NEXT_PUBLIC_BNB_STABLETRUST_CONTRACT_ADDRESS ||
    "0x63bF1207C75060b303f2895574584700d53988ac",
  explorerUrl:
    process.env.NEXT_PUBLIC_BNB_EXPLORER_URL || "https://testnet.bscscan.com/tx/",
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "97"),
};

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

export function useConfidentialClient() {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [config, setConfig] = useState<ConfidentialConfig>(DEFAULT_CONFIG);
  const [client, setClient] = useState<ConfidentialTransferClient | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [userKeys, setUserKeys] = useState<{
    publicKey: string;
    privateKey: string;
  } | null>(null);
  const [balances, setBalances] = useState({
    public: "0",
    confidential: "0",
    native: "0",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState("mSTB");
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // 🎯 Network Tracking State Layer
  const [activeChainId, setActiveChainId] = useState<number | null>(null);

  // 🎯 Computed Variable: Dynamic Network Protection Hook
  const isWrongNetwork = useMemo(() => {
    if (!authenticated || !activeChainId) return false;
    return activeChainId !== config.chainId;
  }, [authenticated, activeChainId, config.chainId]);

  useEffect(() => {
    async function initRpc() {
      try {
        const res = await getRpcUrl();
        if (res.success && res.rpcUrl) {
          setConfig((prev) => ({ ...prev, rpcUrl: res.rpcUrl }));
        }
      } catch (err) {
        console.warn("Failed to fetch RPC URL", err);
      }
    }
    initRpc();
  }, []);

  useEffect(() => {
    console.log("Config is now set for chainId:", config.chainId);
  }, [config]);

  useEffect(() => {
    if (!config.tokenAddress || !config.rpcUrl) return;
    async function fetchTokenDetails() {
      try {
        const provider = new ethers.JsonRpcProvider(config.rpcUrl);
        const tokenContract = new ethers.Contract(
          config.tokenAddress,
          ERC20_ABI,
          provider,
        );

        const [sym, dec] = await Promise.all([
          tokenContract.symbol().catch(() => "mSTB"),
          tokenContract.decimals().catch(() => 18),
        ]);

        setTokenSymbol(sym);
        setTokenDecimals(Number(dec));
      } catch (err) {
        console.warn("Failed to fetch token details", err);
      }
    }
    fetchTokenDetails();
  }, [config.tokenAddress, config.rpcUrl]);

  useEffect(() => {
    try {
      const c = new ConfidentialTransferClient(
        config.rpcUrl, 
        config.contractAddress, 
        config.chainId
      );
      setClient(c);
    } catch (err) {
      console.error("Failed to initialize client", err);
    }
  }, [config.rpcUrl, config.contractAddress, config.chainId]);

  // ─── Reactive Core Signer, Network, and Swap Listener Effect ───
// ─── REPLACE THE EXISTING getSigner EFFECT IN YOUR HOOK WITH THIS ───
useEffect(() => {
  let providerInstance: any = null;

  const handleAccountChange = (accounts: string[]) => {
    console.log("🦊 Native Wallet Account Switch Detected:", accounts);
    // Re-trigger balance and key recalculations for the new account
    if (accounts.length > 0) {
      fetchBalances(true);
    }
  };

  async function getSigner() {
    if (authenticated && wallets.length > 0) {
      // 🎯 FIXED: Always tie target interaction to the currently active/selected wallet connector
      let wallet = wallets.find((w) => w.meta?.primary) || wallets[0];

      if (user?.wallet?.address) {
        const matchingWallet = wallets.find(
          (w) => w.address.toLowerCase() === user.wallet?.address?.toLowerCase()
        );
        if (matchingWallet) wallet = matchingWallet;
      }

      // Parse Chain ID cleanly out of Privy array tracking primitives
      const walletChainId = typeof wallet.chainId === "string" 
        ? parseInt(wallet.chainId.split(":")[1] || wallet.chainId, 10) 
        : wallet.chainId;
      setActiveChainId(Number(walletChainId));

      try {
        // Grab the low-level provider context
        providerInstance = await wallet.getEthereumProvider();
        
        // 🎯 FIXED: Bind an account listener directly to the extension provider instance
        if (providerInstance?.on) {
          providerInstance.on("accountsChanged", handleAccountChange);
        }

        const ethereProvider = new ethers.BrowserProvider(providerInstance);
        const s = await ethereProvider.getSigner();
        const address = await s.getAddress();
        
        setSigner(s);

        // Reactive Keys Sync Block: Check storage when addresses flip
        const cachedPk = localStorage.getItem(`st_conf_pk_${address.toLowerCase()}`);
        const cachedPub = localStorage.getItem(`st_conf_pub_${address.toLowerCase()}`);
        
        if (cachedPk && cachedPub) {
          setUserKeys({ privateKey: cachedPk, publicKey: cachedPub });
        } else {
          setUserKeys(null); // Force key derivation prompt on the new address
        }
      } catch (err) {
        console.error("Failed to set signer on account swap:", err);
      }
    } else {
      setSigner(null);
      setUserKeys(null);
      setActiveChainId(null);
      setBalances({ public: "0", confidential: "0", native: "0" });
    }
  }

  getSigner();

  // Cleanup native listeners to prevent memory leaks and duplicate polling loops
  return () => {
    if (providerInstance?.removeListener) {
      providerInstance.removeListener("accountsChanged", handleAccountChange);
    }
  };

  // 🎯 FIXED: Dependent parameters now react when the primary wallet address changes
}, [authenticated, wallets, wallets[0]?.address, wallets[0]?.chainId, config.chainId, user]);

  // 🎯 Fast Action Executor: Native Trigger routing chain shifts over Privy context
  const switchNetwork = useCallback(async () => {
    if (wallets && wallets[0]) {
      try {
        await wallets[0].switchChain(config.chainId);
      } catch (err) {
        console.error("Failed native network switch execution:", err);
      }
    }
  }, [wallets, config.chainId]);

  const ensureAccount = useCallback(async () => {
    if (!client || !signer) return;
    setLoading(true);
    setError(null);
    try {
      const address = await signer.getAddress();
      const keys = await client.ensureAccount(signer, { waitForFinalization: false });
      
      if (keys?.privateKey && keys?.publicKey) {
        localStorage.setItem(`st_conf_pk_${address.toLowerCase()}`, keys.privateKey);
        localStorage.setItem(`st_conf_pub_${address.toLowerCase()}`, keys.publicKey);
        setUserKeys(keys);
      }
      return keys;
    } catch (err) {
      const errorMessage = parseError(err as AppError);
      setError(errorMessage);
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client, signer]);

  const fetchBalances = useCallback(
    async (silent: boolean = false) => {
      if (!signer || isWrongNetwork) return; // Prevent raw polling calls on invalid networks
      if (!silent) setLoading(true);
      try {
        const address = await signer.getAddress();
        const provider =
          signer.provider || new ethers.JsonRpcProvider(config.rpcUrl);

        const nativeBal = await provider.getBalance(address);

        let publicBal = BigInt(0);
        let confidentialBal: { amount: bigint } = { amount: BigInt(0) };

        if (client) {
          try {
            publicBal = await client.getPublicBalance(
              address,
              config.tokenAddress,
            );
          } catch (e) {
            console.warn("Failed to fetch public balance", e);
          }
        }

        if (client && userKeys) {
          try {
            const cb = await client.getConfidentialBalance(
              address,
              userKeys.privateKey,
              config.tokenAddress,
            );
            confidentialBal = { amount: BigInt(cb.amount) };
          } catch (e) {
            console.warn("Failed to fetch confidential balance", e);
          }
        }

        setBalances({
          public: ethers.formatUnits(publicBal, tokenDecimals),
          confidential: ethers.formatUnits(
            confidentialBal.amount,
            tokenDecimals,
          ),
          native: parseFloat(ethers.formatEther(nativeBal)).toFixed(4),
        });
      } catch (err) {
        console.error("Error fetching balances:", err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [
      client,
      signer,
      userKeys,
      config.tokenAddress,
      tokenDecimals,
      config.rpcUrl,
      isWrongNetwork,
    ],
  );

  useEffect(() => {
    if (!signer || isWrongNetwork) return;

    fetchBalances(true);

    const interval = setInterval(() => {
      fetchBalances(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchBalances, signer, isWrongNetwork]);

  const confidentialDeposit = useCallback(
    async (amount: string) => {
      if (!client || !signer)
        throw new Error("Client or signer not initialized");
      setLoading(true);
      setError(null);
      try {
        const amountWei = ethers.parseUnits(amount, tokenDecimals);
        const receipt = await client.confidentialDeposit(
          signer,
          config.tokenAddress,
          amountWei,
          { waitForFinalization: false }
        );

        setTimeout(() => fetchBalances(true), 2000);

        setLastTxHash(receipt.hash);
        return { hash: receipt.hash };
      } catch (err) {
        const errorMessage = parseError(err as AppError);
        setError(errorMessage);
        throw err;
      } finally { // 🎯 Fixed the typo here from 'fill' to 'finally'
        setLoading(false);
      }
    },
    [client, signer, fetchBalances, config.tokenAddress, tokenDecimals],
  );

  const confidentialTransfer = useCallback(
    async (recipient: string, amount: string) => {
      if (!client || !signer)
        throw new Error("Client or signer not initialized");
      setLoading(true);
      setError(null);
      try {
        const amountWei = ethers.parseUnits(amount, tokenDecimals);
        const receipt = await client.confidentialTransfer(
          signer,
          recipient,
          config.tokenAddress,
          amountWei, 
          { waitForFinalization: false }
        );
        setTimeout(() => fetchBalances(true), 2000);
        setLastTxHash(receipt.hash);
        return { hash: receipt.hash };
      } catch (err) {
        const errorMessage = parseError(err as AppError);
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client, signer, fetchBalances, config.tokenAddress, tokenDecimals],
  );

  const withdraw = useCallback(
    async (amount: string) => {
      if (!client || !signer)
        throw new Error("Client or signer not initialized");
      setLoading(true);
      setError(null);
      try {
        const amountWei = ethers.parseUnits(amount, tokenDecimals);
        const receipt = await client.withdraw(
          signer,
          config.tokenAddress,
          amountWei, 
          { waitForFinalization: false }
        );
        setTimeout(() => fetchBalances(true), 2000);
        setLastTxHash(receipt.hash);
        return { hash: receipt.hash };
      } catch (err) {
        const errorMessage = parseError(err as AppError);
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client, signer, fetchBalances, config.tokenAddress, tokenDecimals],
  );

  const requestFaucet = useCallback(async () => {
    if (!signer) throw new Error("Signer not initialized");
    setLoading(true);
    setError(null);
    try {
      const address = await signer.getAddress();
      const result = await sendFaucet(address);
      if (!result.success) {
        throw new Error(result.error || "Faucet request failed");
      }
      setTimeout(() => fetchBalances(true), 2000);
      return result;
    } catch (err) {
      const errorMessage = parseError(err as AppError);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [signer, fetchBalances]);

  return {
    config,
    client,
    signer,
    userKeys,
    balances,
    loading,
    error,
    isWrongNetwork, 
    switchNetwork,   
    ensureAccount,
    fetchBalances,
    requestFaucet,
    confidentialDeposit,
    confidentialTransfer,
    withdraw,
    tokenSymbol,
    tokenDecimals,
    lastTxHash,
  };
}