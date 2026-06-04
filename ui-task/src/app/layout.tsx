import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "StableTrust BNB Demo",
  description: "Confidential BNB transfers on testnet with a full end-to-end UI.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-[#3557d5] selection:text-white">
        <Providers>
          <main className="min-h-screen px-4 py-4 md:px-5 md:py-5">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
