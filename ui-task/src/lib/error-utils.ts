export type AppErrorCategory =
  | "wallet"
  | "network"
  | "balance"
  | "relayer"
  | "transaction"
  | "validation"
  | "unknown";

export type AppErrorInfo = {
  category: AppErrorCategory;
  title: string;
  message: string;
  hint: string;
};

function normalizeMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
  }
  return "Unknown error";
}

export function getFriendlyError(error: unknown, context = "operation"): AppErrorInfo {
  const rawMessage = normalizeMessage(error);
  const message = rawMessage.toLowerCase();

  if (
    message.includes("user rejected") ||
    message.includes("user denied") ||
    message.includes("rejected the request") ||
    message.includes("action rejected")
  ) {
    return {
      category: "wallet",
      title: "Request cancelled",
      message: `The ${context} was cancelled in your wallet.`,
      hint: "Approve the request again when you’re ready.",
    };
  }

  if (message.includes("wrong network") || message.includes("chain mismatch") || message.includes("network changed")) {
    return {
      category: "network",
      title: "Wrong network",
      message: `Switch your wallet to BNB Smart Chain Testnet before continuing.`,
      hint: "Use the network switch control, then retry the step.",
    };
  }

  if (
    message.includes("insufficient funds") ||
    message.includes("insufficient balance") ||
    message.includes("insufficient allowance") ||
    message.includes("allowance")
  ) {
    return {
      category: "balance",
      title: "Insufficient funds",
      message: `Your wallet does not have enough balance or allowance for this ${context}.`,
      hint: "Top up BNB for gas or increase the token allowance, then try again.",
    };
  }

  if (
    message.includes("pending action") ||
    message.includes("timeout waiting") ||
    message.includes("finalization timeout") ||
    message.includes("still processing") ||
    message.includes("websocket") ||
    message.includes("connection timeout") ||
    message.includes("1013")
  ) {
    return {
      category: "relayer",
      title: "Relayer still catching up",
      message: `FairyPort or the RPC endpoint has not finished processing the ${context}.`,
      hint: "Wait a few seconds and use Refresh Assets before retrying.",
    };
  }

  if (
    message.includes("bad data") ||
    message.includes("could not decode") ||
    message.includes("abi") ||
    message.includes("execution reverted") ||
    message.includes("revert")
  ) {
    return {
      category: "transaction",
      title: "Transaction failed",
      message: `The ${context} was rejected by the on-chain contract.`,
      hint: "Check the contract address, token address, and account state, then retry.",
    };
  }

  if (
    message.includes("invalid address") ||
    message.includes("unsupported chain") ||
    message.includes("contract address is missing") ||
    message.includes("rpc url is missing")
  ) {
    return {
      category: "validation",
      title: "Configuration issue",
      message: rawMessage,
      hint: "Double-check the frontend env vars and deployed contract addresses.",
    };
  }

  return {
    category: "unknown",
    title: "Unexpected error",
    message: rawMessage,
    hint: "Retry once, then refresh the page if the issue keeps happening.",
  };
}

export function getErrorMessage(error: unknown, context = "operation") {
  return getFriendlyError(error, context).message;
}
