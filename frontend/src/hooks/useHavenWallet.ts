"use client";

/**
 * useHavenWallet
 * ==============
 * Manages state for wallets created/imported via WalletAuthModal.
 * Exposes signer + provider so SignerContext can use them.
 *
 * FIX: Address is always normalized to EIP-55 checksum format via
 * ethers.getAddress() before being stored. This prevents 422 errors
 * from the SATIN oracle backend (Web3.py's to_checksum_address() is
 * strict and rejects lowercase addresses).
 */

import { useState, useCallback } from "react";
import { ethers } from "ethers";

interface HavenWalletState {
  address:   string | null;
  signer:    ethers.Wallet | null;
  provider:  ethers.JsonRpcProvider | null;
  connected: boolean;
}

const EMPTY: HavenWalletState = {
  address: null, signer: null, provider: null, connected: false,
};

// export function useHavenWallet() {
//   const [state, setState] = useState<HavenWalletState>(EMPTY);

//   const setHavenWallet = useCallback(
//     (address: string, provider: ethers.JsonRpcProvider, signer: ethers.Wallet) => {
//       // Normalize to EIP-55 checksum address — ethers.getAddress() throws if
//       // the address is genuinely invalid, which is the right behavior here.
//       const checksumAddress = ethers.getAddress(address);
//       setState({ address: checksumAddress, provider, signer, connected: true });
//     },
//     []
//   );

//   const disconnectHaven = useCallback(() => {
//     setState(EMPTY);
//   }, []);

//   return {
//     havenAddress:   state.address,
//     havenSigner:    state.signer,
//     havenProvider:  state.provider,
//     havenConnected: state.connected,
//     setHavenWallet,
//     disconnectHaven,
//   };
// }

export { useHavenWallet } from "@/contexts/HavenWalletContext";