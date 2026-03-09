"use client";

/**
 * HAVEN — SignerContext
 * =====================
 * Single source of truth untuk active signer di seluruh app.
 *
 * Kenapa perlu ini:
 *   - MetaMask pakai wagmi's useWalletClient() → ethers.BrowserProvider
 *   - Haven native wallet pakai ethers.Wallet langsung
 *   - Semua komponen (SubmitImpactForm, P2PTransfer, GovernancePanel, dll)
 *     cukup pakai useSigner() dari sini — tidak peduli asalnya dari mana.
 *
 * Usage di komponen manapun:
 *   import { useSigner } from "@/contexts/SignerContext";
 *
 *   const { signer, address, isReady, walletType } = useSigner();
 *
 *   // Buat contract instance:
 *   const contract = new ethers.Contract(ADDR, ABI, signer);
 *   await contract.someMethod();
 *
 *   // Kirim transaksi langsung:
 *   const tx = await signer.sendTransaction({ to: "0x...", value: parseEther("1.0") });
 */

import {
  createContext, useContext, useEffect, useState,
  useCallback, type ReactNode,
} from "react";
import { ethers } from "ethers";
import { useWalletClient, useAccount } from "wagmi";
import { useHavenWallet } from "@/hooks/useHavenWallet";
import { ENV } from "@/utils/env";

/* ── Types ──────────────────────────────────────────────────────────────────── */

export type WalletType = "metamask" | "haven_native" | "none";

export interface SignerState {
  /** The active ethers.js signer — null if not connected */
  signer: ethers.Signer | null;
  /** Active wallet address (checksummed) */
  address: string | null;
  /** Provider connected to BridgeStone RPC */
  provider: ethers.JsonRpcProvider | null;
  /** True when a signer is available and ready to sign */
  isReady: boolean;
  /** Which wallet type is currently active */
  walletType: WalletType;
  /** Human-readable connection status */
  status: string;
}

const DEFAULT_STATE: SignerState = {
  signer: null,
  address: null,
  provider: null,
  isReady: false,
  walletType: "none",
  status: "disconnected",
};

/* ── Context ────────────────────────────────────────────────────────────────── */

const SignerContext = createContext<SignerState>(DEFAULT_STATE);

/* ── Provider ───────────────────────────────────────────────────────────────── */

export function SignerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SignerState>(DEFAULT_STATE);

  // MetaMask / RainbowKit
  const { address: mmAddress, isConnected: mmConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Haven native wallet
  const { havenAddress, havenConnected, havenSigner, havenProvider } = useHavenWallet();

  // Shared BridgeStone provider (for read-only calls & Haven wallet)
  const getRpcProvider = useCallback(() => {
    return new ethers.JsonRpcProvider(
      ENV.RPC_URL ||
      "http://127.0.0.1:9654/ext/bc/w4DDDiThpt7dv6A1T2UqkAUxZkC1JVceqg3QMpZ8nL4KPQcHs/rpc"
    );
  }, []);

  useEffect(() => {
    // ── Priority 1: MetaMask (wagmi walletClient) ──────────────────────────
    if (mmConnected && walletClient && mmAddress) {
      try {
        // Convert wagmi walletClient → ethers.js signer
        // wagmi v2 uses viem under the hood; we wrap it for ethers compatibility
        const provider = new ethers.BrowserProvider(walletClient as any);
        provider.getSigner().then((signer) => {
          setState({
            signer,
            // Normalize to EIP-55 checksum — MetaMask usually returns this
            // already, but normalize defensively so every downstream consumer
            // (oracle API, contract calls, address comparisons) gets a
            // consistent format regardless of wallet source.
            address: ethers.getAddress(mmAddress),
            provider: getRpcProvider(),   // use RPC provider for reads
            isReady: true,
            walletType: "metamask",
            status: "connected_metamask",
          });
        }).catch(() => {
          setState(DEFAULT_STATE);
        });
      } catch {
        setState(DEFAULT_STATE);
      }
      return;
    }

    // ── Priority 2: Haven native wallet ───────────────────────────────────
    if (havenConnected && havenSigner && havenAddress) {
      setState({
        signer: havenSigner,
        address: havenAddress,
        provider: havenProvider || getRpcProvider(),
        isReady: true,
        walletType: "haven_native",
        status: "connected_haven",
      });
      return;
    }

    // ── No wallet ─────────────────────────────────────────────────────────
    setState(DEFAULT_STATE);

  }, [mmConnected, walletClient, mmAddress, havenConnected, havenSigner, havenAddress, havenProvider, getRpcProvider]);

  return (
    <SignerContext.Provider value={state}>
      {children}
    </SignerContext.Provider>
  );
}

/* ── Hook ───────────────────────────────────────────────────────────────────── */

/**
 * Primary hook — use this in any component that needs to sign transactions.
 *
 * @example
 * const { signer, address, isReady } = useSigner();
 * if (!isReady) return <p>Connect wallet first</p>;
 * const contract = new ethers.Contract(ADDR, ABI, signer!);
 */
export function useSigner(): SignerState {
  return useContext(SignerContext);
}

/**
 * Convenience hook — get a contract instance with the active signer attached.
 * Returns null if no signer available.
 *
 * @example
 * const vault = useContract(CONTRACTS.BENEVOLENCE_VAULT, BENEVOLENCE_VAULT_ABI);
 * if (vault) await vault.donate(parseEther("10"));
 */
export function useContract<T extends ethers.BaseContract>(
  address: string,
  abi: ethers.InterfaceAbi,
): T | null {
  const { signer, isReady } = useSigner();
  if (!isReady || !signer) return null;
  return new ethers.Contract(address, abi, signer) as unknown as T;
}