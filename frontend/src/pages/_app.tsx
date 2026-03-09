import type { AppProps } from "next/app";
import Head from "next/head";
import { defineChain } from "viem";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SignerProvider } from "@/contexts/SignerContext";
import { HavenWalletProvider } from "@/contexts/HavenWalletContext";
import "@rainbow-me/rainbowkit/styles.css";
import "../styles/globals.css";

const getDynamicConfig = () => {
  if (typeof window === "undefined") return {
    rpc: process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:9654/ext/bc/w4DDDiThpt7dv6A1T2UqkAUxZkC1JVceqg3QMpZ8nL4KPQcHs/rpc",
    url: "http://localhost:3000",
  };
  const host     = window.location.hostname;
  const protocol = window.location.protocol;
  const port     = window.location.port ? `:${window.location.port}` : "";
  return {
    rpc: process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:9654/ext/bc/w4DDDiThpt7dv6A1T2UqkAUxZkC1JVceqg3QMpZ8nL4KPQcHs/rpc",
    url: `${protocol}//${host}${port}`,
  };
};

const dynamicCfg = getDynamicConfig();

const havenNetwork = defineChain({
  id: 666999,
  name: "BridgeStone",
  nativeCurrency: { decimals: 18, name: "STC Token", symbol: "STC" },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL || dynamicCfg.rpc] },
  },
  testnet: true,
});

const wagmiConfig = getDefaultConfig({
  appName:   "HAVEN HUMANITY",
  appUrl:    dynamicCfg.url,
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "07c91816e8fa370601f5530ffae69547",
  chains:    [havenNetwork],
  ssr:       true,
  transports: { [havenNetwork.id]: http() },
});

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <Head>
        <title>HAVEN Humanity</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#000000" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {/*
            SignerProvider wraps everything INSIDE RainbowKit+Wagmi
            so it can read useWalletClient() and useAccount() from wagmi,
            AND havenSigner from useHavenWallet.
            Any component anywhere in the tree can now call useSigner().
          */}
          <HavenWalletProvider>
          <SignerProvider>
            <Component {...pageProps} />
          </SignerProvider>
          </HavenWalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}