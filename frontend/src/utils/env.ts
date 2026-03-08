// This file serves as the single source of truth for all environment variables.
// It ensures that components don't fall back to hardcoded localhost indiscriminately
// and use the correct names from .env.local

export const ENV = {
    ORACLE_URL: process.env.NEXT_PUBLIC_ORACLE_URL || "https://communication-app-harper-load.trycloudflare.com",
    HAVEN_ORACLE_KEY: process.env.NEXT_PUBLIC_HAVEN_ORACLE_KEY || "HAVEN_ROKAN_NJXBDSA_010011",
    RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:9654/ext/bc/w4DDDiThpt7dv6A1T2UqkAUxZkC1JVceqg3QMpZ8nL4KPQcHs/rpc",
    NETWORK_NAME: process.env.NEXT_PUBLIC_NETWORK_NAME || "BridgeStone",
    WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",

    VAULT_ADDRESS: process.env.NEXT_PUBLIC_VAULT_ADDRESS || "0x4B1301a72Da30c4ab3E0CaeFf40Ca28A0b416088",
    LEDGER_ADDRESS: process.env.NEXT_PUBLIC_LEDGER_ADDRESS || "0xEEff17E284d64dcBFB0D3e5b8867F83a95EB44A5",
    SID_ADDRESS: process.env.NEXT_PUBLIC_SID_ADDRESS || "0x6141aE1ee80fF18A239Fa427c2d6d65982602FaC",
    SUPPLY_GOV_ADDRESS: process.env.NEXT_PUBLIC_SUPPLY_GOV_ADDRESS || "0x5fEdD60933aF9410f9Fa1eAb14E50a414Aa680c4",
    CRISIS_FUND_ADDRESS: process.env.NEXT_PUBLIC_CRISIS_FUND_ADDRESS || "0x28f8D147e76f0D88ccbf80B2FA10Eec7eE41C9C6",
};
