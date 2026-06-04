"use client";

import { darkTheme, getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider, createConfig, http } from "wagmi";
import type { ReactNode } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { BNB_RPC_URL, BNB_TESTNET } from "@/config/bnb";

const { connectors } = getDefaultWallets({
  appName: "StableTrust BNB Demo",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "367e7033f1d106ae8bdbbd60e7c478a9",
});

const config = createConfig({
  chains: [BNB_TESTNET],
  connectors,
  transports: {
    [BNB_TESTNET.id]: http(BNB_RPC_URL),
  },
});

export function RainbowKitWrapper({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider
        theme={darkTheme({
          accentColor: "#f0b90b",
          accentColorForeground: "black",
          borderRadius: "large",
          fontStack: "system",
          overlayBlur: "small",
        })}
        initialChain={BNB_TESTNET}
      >
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
