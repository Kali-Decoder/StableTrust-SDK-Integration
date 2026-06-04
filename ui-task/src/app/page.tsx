"use client";

import dynamic from "next/dynamic";

// Force Next.js to load the component ONLY inside the client's browser space
const ConfidentialTransferDashboard = dynamic(
  () => import("@/components/ConfidentialTransferDashboard"),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <ConfidentialTransferDashboard />
    </main>
  );
}