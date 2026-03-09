// This file serves as the single source of truth for all environment variables.
// It ensures that components don't fall back to hardcoded localhost indiscriminately
// and use the correct names from .env.local

export const ENV = {
    ORACLE_URL: process.env.NEXT_PUBLIC_ORACLE_URL || "https://communication-app-harper-load.trycloudflare.com",
    HAVEN_ORACLE_KEY: process.env.NEXT_PUBLIC_HAVEN_ORACLE_KEY || "HAVEN_ROKAN_NJXBDSA_010011",
    RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || "https://answer-hansen-understand-built.trycloudflare.com/ext/bc/Yxdrh1Sof5JoTTn66vQjNLdvf7JMYvwMMYUWrjAJBphQ2W9qs/rpc",
    NETWORK_NAME: process.env.NEXT_PUBLIC_NETWORK_NAME || "BridgeStone",
    WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",

    VAULT_ADDRESS: process.env.NEXT_PUBLIC_VAULT_ADDRESS || "0x7E550F089B91Ccb233266Cc25b1C5Cff97730422",
    LEDGER_ADDRESS: process.env.NEXT_PUBLIC_LEDGER_ADDRESS || "0xBfD647E7DA80be6c9ACc74c1B29B610871923825",
    SID_ADDRESS: process.env.NEXT_PUBLIC_SID_ADDRESS || "0xEBdAADcdB188B5fbAd7a5d0701C4250bfEAcff07",
    SUPPLY_GOV_ADDRESS: process.env.NEXT_PUBLIC_SUPPLY_GOV_ADDRESS || "0x3DEE305134b715A5d9BE191F6172A3a9107213ae",
    CRISIS_FUND_ADDRESS: process.env.NEXT_PUBLIC_CRISIS_FUND_ADDRESS || "0xAAc8D8Aa86D46F008562f1e9883ea9058C938EEB",
};
