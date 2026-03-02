// This file serves as the single source of truth for all environment variables.
// It ensures that components don't fall back to hardcoded localhost indiscriminately
// and use the correct names from .env.local

export const ENV = {
    ORACLE_URL: process.env.NEXT_PUBLIC_ORACLE_URL,
    SATIN_API_KEY: process.env.NEXT_PUBLIC_SATIN_API_KEY || "",

    CHAIN_ID: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 6969,
    RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || "",
    NETWORK_NAME: process.env.NEXT_PUBLIC_NETWORK_NAME || "APEXNETWORK",
    WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",

    VAULT_ADDRESS: process.env.NEXT_PUBLIC_VAULT_ADDRESS || "",
    LEDGER_ADDRESS: process.env.NEXT_PUBLIC_LEDGER_ADDRESS || "",
    SID_ADDRESS: process.env.NEXT_PUBLIC_SID_ADDRESS || "",
    SUPPLY_GOV_ADDRESS: process.env.NEXT_PUBLIC_SUPPLY_GOV_ADDRESS || "",
    CRISIS_FUND_ADDRESS: process.env.NEXT_PUBLIC_CRISIS_FUND_ADDRESS || "",
};
