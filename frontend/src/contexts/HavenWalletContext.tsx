"use client";

/**
 * HavenWalletContext
 * ==================
 * Single shared state untuk Haven native wallet di seluruh app.
 *
 * Kenapa Context dan bukan hook biasa:
 *   Custom hook (useState di dalam hook) membuat state LOKAL per komponen.
 *   Jika dipanggil di dua tempat (index.tsx + SignerContext.tsx), masing-masing
 *   dapat salinan state sendiri — bukan state yang sama.
 *
 *   React Context menyimpan state di satu tempat (Provider), dan semua
 *   useHavenWallet() di mana pun membaca dari sumber yang sama.
 *
 * Setup (di _app.tsx):
 *   Tambahkan <HavenWalletProvider> di dalam <WagmiProvider>:
 *
 *   <WagmiProvider config={wagmiConfig}>
 *     <QueryClientProvider client={queryClient}>
 *       <HavenWalletProvider>          ← tambahkan ini
 *         <RainbowKitProvider>
 *           <SignerProvider>
 *             <Component {...pageProps} />
 *           </SignerProvider>
 *         </RainbowKitProvider>
 *       </HavenWalletProvider>         ← dan ini
 *     </QueryClientProvider>
 *   </WagmiProvider>
 */

import {
  createContext, useContext, useState, useCallback,
  type ReactNode,
} from "react";
import { ethers } from "ethers";

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface HavenWalletState {
  address:   string | null;
  signer:    ethers.Wallet | null;
  provider:  ethers.JsonRpcProvider | null;
  connected: boolean;
}

interface HavenWalletContextValue extends HavenWalletState {
  setHavenWallet:  (address: string, provider: ethers.JsonRpcProvider, signer: ethers.Wallet) => void;
  disconnectHaven: () => void;
}

/* ── Context ────────────────────────────────────────────────────────────────── */

const EMPTY: HavenWalletState = {
  address: null, signer: null, provider: null, connected: false,
};

const HavenWalletContext = createContext<HavenWalletContextValue>({
  ...EMPTY,
  setHavenWallet:  () => { throw new Error("HavenWalletProvider not mounted"); },
  disconnectHaven: () => { throw new Error("HavenWalletProvider not mounted"); },
});

/* ── Provider ───────────────────────────────────────────────────────────────── */

export function HavenWalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HavenWalletState>(EMPTY);

  const setHavenWallet = useCallback(
    (address: string, provider: ethers.JsonRpcProvider, signer: ethers.Wallet) => {
      // Normalize to EIP-55 checksum — ethers.Wallet dapat mengembalikan
      // lowercase address, yang ditolak oleh Web3.py di backend oracle.
      const checksumAddress = ethers.getAddress(address);
      setState({ address: checksumAddress, provider, signer, connected: true });
    },
    []
  );

  const disconnectHaven = useCallback(() => {
    setState(EMPTY);
  }, []);

  return (
    <HavenWalletContext.Provider value={{ ...state, setHavenWallet, disconnectHaven }}>
      {children}
    </HavenWalletContext.Provider>
  );
}

/* ── Hook ───────────────────────────────────────────────────────────────────── */

export function useHavenWallet() {
  const ctx = useContext(HavenWalletContext);
  return {
    havenAddress:   ctx.address,
    havenSigner:    ctx.signer,
    havenProvider:  ctx.provider,
    havenConnected: ctx.connected,
    setHavenWallet:  ctx.setHavenWallet,
    disconnectHaven: ctx.disconnectHaven,
  };
}