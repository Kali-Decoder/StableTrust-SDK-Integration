"use client";

import { ReactNode } from "react";
import { RainbowKitWrapper } from "./RainbowKitWrapper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

interface ProvidersProps {
    children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <RainbowKitWrapper>
                {children}
            </RainbowKitWrapper>
        </QueryClientProvider>
    );
}
