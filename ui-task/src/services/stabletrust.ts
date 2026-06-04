import { ethers } from "ethers";
import { ConfidentialTransferClient, ERC20_ABI } from "@/config/sdk-proxy";
import { NETWORKS_CONFIG } from "@/config/bnb";
import { getFriendlyError } from "@/lib/error-utils";

const gasOverrides = {
  maxFeePerGas: ethers.parseUnits("20", "gwei"),
  maxPriorityFeePerGas: ethers.parseUnits("5", "gwei"),
};

export class StableTrustService {
  private client: any;
  private signer: ethers.Signer;
  private nonceManager: ethers.NonceManager;
  private currentConfig: typeof NETWORKS_CONFIG[keyof typeof NETWORKS_CONFIG];

  constructor(browserProvider: any, signer: ethers.Signer, chainId: number) {
    this.signer = signer;
    this.nonceManager = new ethers.NonceManager(signer);

    const config = NETWORKS_CONFIG[chainId as keyof typeof NETWORKS_CONFIG];
    if (!config) {
      throw new Error(`Unsupported chain ${chainId}`);
    }

    if (!config.rpcUrl) {
      throw new Error("RPC URL is missing");
    }

    if (!config.contractAddress) {
      throw new Error("Contract address is missing");
    }

    this.currentConfig = config;

    this.client = new ConfidentialTransferClient(
      config.rpcUrl,
      config.contractAddress,
      Number(chainId)
    );
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async waitForSettlement(
    address: string,
    action: string,
    timeoutMs = 90000,
    intervalMs = 2000
  ) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      try {
        const accountInfo = await this.client.getAccountInfo(address);
        const pendingAction = Boolean(accountInfo?.pendingAction);
        const finalized = Boolean(accountInfo?.finalized);

        if (finalized || pendingAction === false) {
          return accountInfo;
        }
      } catch (error) {
        console.warn(`Unable to poll ${action} settlement:`, error);
      }

      await this.sleep(intervalMs);
    }

    throw new Error(
      `Timeout waiting for ${action} settlement. The relayer may still be processing the transaction.`
    );
  }

  private async getStoredConfidentialPrivateKey() {
    const address = await this.signer.getAddress();
  
    if (typeof window === "undefined") {
      return null;
    }
  
    return localStorage.getItem(
      `st_conf_pk_${address.toLowerCase()}`
    );
  }
  
  private async getStoredConfidentialPublicKey() {
    const address = await this.signer.getAddress();
  
    if (typeof window === "undefined") {
      return null;
    }
  
    return localStorage.getItem(
      `st_conf_pub_${address.toLowerCase()}`
    );
  }

  async getBalances(address: string, alicePrivateKey?: string) {
    try {
      const provider = this.signer.provider!;
      const tokenContract = new ethers.Contract(
        this.currentConfig.tokenAddress,
        ERC20_ABI,
        provider
      );

      const [nativeBal, tokenDecimals] = await Promise.all([
        provider.getBalance(address),
        tokenContract.decimals(),
      ]);

      const publicBal = await tokenContract.balanceOf(address);

      let shieldedBalStr = "0.0 (Key Inactive)";
      if (alicePrivateKey) {
        try {
          const confBal = await this.client.getConfidentialBalance(address, alicePrivateKey, this.currentConfig.tokenAddress);
          shieldedBalStr = ethers.formatUnits(confBal.amount, tokenDecimals);
        } catch {
          shieldedBalStr = "0.0 (Registered)";
        }
      }

      return {
        native: parseFloat(ethers.formatEther(nativeBal)).toFixed(4),
        publicToken: ethers.formatUnits(publicBal, tokenDecimals),
        shielded: shieldedBalStr,
      };
    } catch (error) {
      throw new Error(getFriendlyError(error, "balance refresh").message);
    }
  }

  async registerIdentity() {
    const signerAddress = await this.signer.getAddress();
  
    console.log("Registering account");
    console.log("Wallet:", signerAddress);
    console.log("Contract:", this.currentConfig.contractAddress);
    console.log("RPC:", this.currentConfig.rpcUrl);
  
    try {
      const result = await this.client.ensureAccount(
        this.signer,
        {
          waitForFinalization: true,
          operatorWallet: this.signer,
        }
      );
  
      for (let i = 0; i < 30; i++) {
        try {
          const info =
            await this.client.getAccountInfo(
              signerAddress
            );
  
          console.log(
            "Polling account info:",
            info
          );
  
          if (info?.[0] === true) {
            break;
          }
        } catch (err) {
          console.log(
            "Polling failed:",
            err
          );
        }
  
        await new Promise(
          (resolve) => setTimeout(resolve, 2000)
        );
      }
  
      const accountInfo =
        await this.client.getAccountInfo(
          signerAddress
        );
  
      console.log(
        "Account info after ensureAccount:",
        accountInfo
      );
  
      console.log(
        "ensureAccount result:",
        result
      );
  
      // Save confidential keys locally
      if (
        typeof window !== "undefined" &&
        result?.privateKey &&
        result?.publicKey
      ) {
        localStorage.setItem(
          `st_conf_pk_${signerAddress.toLowerCase()}`,
          result.privateKey
        );
  
        localStorage.setItem(
          `st_conf_pub_${signerAddress.toLowerCase()}`,
          result.publicKey
        );
  
        console.log(
          "✅ Confidential private key saved"
        );
  
        console.log(
          "✅ Confidential public key saved"
        );
      }
  
      return result;
    } catch (err) {
      console.error(
        "ensureAccount failed:",
        err
      );
      throw new Error(getFriendlyError(err, "account registration").message);
    }
  }

  // 🛠️ FIX: Ingest standard dynamic amount strings directly from the UI inputs
  async shieldDeposit(amountStr: string) {
    try {
      console.log("=== DEPOSIT START ===");

      const address = await this.signer.getAddress();
      console.log("Wallet:", address);
      console.log("Amount:", amountStr);
      console.log("Token:", this.currentConfig.tokenAddress);
      console.log("Diamond:", this.currentConfig.contractAddress);

      const tokenContract = new ethers.Contract(
        this.currentConfig.tokenAddress,
        ERC20_ABI,
        this.signer
      );

      const depositValue = ethers.parseUnits(amountStr, 18);

      const balance = await tokenContract.balanceOf(address);
      console.log("Public Balance:", balance.toString());

      const allowance = await tokenContract.allowance(
        address,
        this.currentConfig.contractAddress
      );
      console.log("Allowance Before:", allowance.toString());

      const approveTx = await tokenContract.approve(
        this.currentConfig.contractAddress,
        depositValue,
        gasOverrides
      );

      console.log("Approve Tx:", approveTx.hash);

      await approveTx.wait();

      console.log("Approve Confirmed");

      this.nonceManager.reset();

      const depositTx = await this.client.confidentialDeposit(
        this.nonceManager,
        this.currentConfig.tokenAddress,
        depositValue,
        gasOverrides
      );

      if (depositTx.wait) {
        await depositTx.wait();
      }

      await this.waitForSettlement(address, "deposit");

      return depositTx.hash;
    } catch (error) {
      throw new Error(getFriendlyError(error, "deposit").message);
    }
  }

  // 🛠️ FIX: Ingest target dynamic amount strings directly from the UI inputs
  async privateSend(
    recipientAddress: string,
    amountStr: string
  ) {
    const address = await this.signer.getAddress();
  
    const confidentialPrivateKey = await this.getStoredConfidentialPrivateKey();
  
    if (!confidentialPrivateKey) {
      throw new Error(
        "Confidential private key not found. Please register first."
      );
    }
  
    console.log("=== PRIVATE TRANSFER START ===");
    console.log("Sender:", address);
    console.log("Recipient:", recipientAddress);
    console.log("Amount:", amountStr);
  
    try {
      const balance = await this.client.getConfidentialBalance(
        address,
        confidentialPrivateKey,
        this.currentConfig.tokenAddress
      );

      console.log("LATEST BALANCE BEFORE TRANSFER:", balance);

      const senderInfo = await this.client.getAccountInfo(address);
      const recipientInfo = await this.client.getAccountInfo(recipientAddress);

      console.log("SENDER INFO:", senderInfo);
      console.log("RECIPIENT INFO:", recipientInfo);
  
      this.nonceManager.reset();

      const transferValue = ethers.parseUnits(amountStr, 18);

      console.log("TRANSFER VALUE:", transferValue.toString());

      const tx = await this.client.confidentialTransfer(
        this.nonceManager,
        recipientAddress,
        this.currentConfig.tokenAddress,
        transferValue,
        {
          ...gasOverrides,
        }
      );

      await this.waitForSettlement(address, "transfer");

      console.log("Transfer Tx:", tx.hash);
      return tx.hash;
    } catch (error) {
      throw new Error(getFriendlyError(error, "transfer").message);
    }
  }
 

  // 🛠️ FIX: Ingest exit dynamic amount strings directly from the UI inputs
  async publicExit(amountStr: string) {
    const address = await this.signer.getAddress();
  
    const confidentialPrivateKey = await this.getStoredConfidentialPrivateKey();
  
    if (!confidentialPrivateKey) {
      throw new Error(
        "Confidential private key not found. Please register again."
      );
    }
  
    console.log(
      "Loaded Confidential PK:",
      confidentialPrivateKey
    );
  
    console.log("=== WITHDRAW START ===");
    console.log("Wallet:", address);
    console.log("Amount:", amountStr);
  
    this.nonceManager.reset();
  
    try {
      const withdrawValue = ethers.parseUnits(amountStr, 18);

      const confidentialBalance = await this.client.getConfidentialBalance(
        address,
        confidentialPrivateKey,
        this.currentConfig.tokenAddress
      );

      console.log("Confidential Balance:", confidentialBalance);

      const tx = await this.client.withdraw(
        this.nonceManager,
        this.currentConfig.tokenAddress,
        withdrawValue,
        gasOverrides
      );

      await this.waitForSettlement(address, "withdrawal");
      console.log("Withdraw Tx:", tx.hash);
      return tx.hash;
    } catch (error) {
      throw new Error(getFriendlyError(error, "withdrawal").message);
    }
  }
}
